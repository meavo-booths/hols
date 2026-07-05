import type { Prisma, PrismaClient, VacationRequest } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateRequestDays, countWorkingDays } from "@/lib/dates";
import type { RequestDuration } from "@/lib/days-format";
import { getPublicHolidayDateSet } from "@/lib/public-holidays";

/** Either the global client or an interactive transaction client. */
type Db = PrismaClient | Prisma.TransactionClient;

export async function getYearlyAllowance(
  userId: string,
  year: number,
  db: Db = prisma
): Promise<number> {
  const individual = await db.userAllowance.findUnique({
    where: { userId_year: { userId, year } },
  });
  if (individual) return individual.days;

  const membership = await db.teamMember.findFirst({
    where: { userId },
    include: { team: true },
    orderBy: { createdAt: "asc" },
  });
  if (membership) return membership.team.yearlyAllowance;

  return 25;
}

/**
 * Days a request consumes within a given calendar year. Requests fully inside
 * the year count their stored working-day total. Legacy cross-year requests
 * are pro-rated: only working days falling inside the year count (weekend
 * exclusion only — a close approximation for historical data).
 */
function daysWithinYear(
  req: Pick<VacationRequest, "startDate" | "endDate" | "days">,
  year: number
): number {
  const startYear = req.startDate.getFullYear();
  const endYear = req.endDate.getFullYear();
  if (startYear === endYear) return startYear === year ? req.days : 0;

  const sliceStart = startYear === year ? req.startDate : new Date(year, 0, 1);
  const sliceEnd = endYear === year ? req.endDate : new Date(year, 11, 31);
  if (sliceEnd < sliceStart) return 0;
  return countWorkingDays(sliceStart, sliceEnd);
}

async function getDaysByStatus(
  userId: string,
  year: number,
  status: "APPROVED" | "PENDING",
  db: Db,
  excludeRequestId?: string
): Promise<number> {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59);

  const requests = await db.vacationRequest.findMany({
    where: {
      userId,
      status,
      id: excludeRequestId ? { not: excludeRequestId } : undefined,
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });

  return requests.reduce((sum, req) => sum + daysWithinYear(req, year), 0);
}

export async function getUsedDays(
  userId: string,
  year: number,
  db: Db = prisma
): Promise<number> {
  return getDaysByStatus(userId, year, "APPROVED", db);
}

export async function getPendingDays(
  userId: string,
  year: number,
  db: Db = prisma,
  excludeRequestId?: string
): Promise<number> {
  return getDaysByStatus(userId, year, "PENDING", db, excludeRequestId);
}

export async function getRemainingDays(
  userId: string,
  year: number,
  db: Db = prisma
): Promise<{
  allowance: number;
  used: number;
  remaining: number;
}> {
  const allowance = await getYearlyAllowance(userId, year, db);
  const used = await getUsedDays(userId, year, db);
  return { allowance, used, remaining: Math.max(0, allowance - used) };
}

/**
 * Batched variant of getRemainingDays for admin/team pages: three queries
 * total instead of several per user.
 */
export async function getRemainingDaysForUsers(
  userIds: string[],
  year: number,
  db: Db = prisma
): Promise<Record<string, { allowance: number; used: number; remaining: number }>> {
  if (userIds.length === 0) return {};

  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59);

  const [overrides, memberships, requests] = await Promise.all([
    db.userAllowance.findMany({ where: { year, userId: { in: userIds } } }),
    db.teamMember.findMany({
      where: { userId: { in: userIds } },
      include: { team: { select: { yearlyAllowance: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.vacationRequest.findMany({
      where: {
        userId: { in: userIds },
        status: "APPROVED",
        startDate: { lte: end },
        endDate: { gte: start },
      },
    }),
  ]);

  const overrideByUser = new Map(overrides.map((o) => [o.userId, o.days]));
  const teamAllowanceByUser = new Map<string, number>();
  for (const membership of memberships) {
    if (!teamAllowanceByUser.has(membership.userId)) {
      teamAllowanceByUser.set(membership.userId, membership.team.yearlyAllowance);
    }
  }
  const usedByUser = new Map<string, number>();
  for (const req of requests) {
    usedByUser.set(req.userId, (usedByUser.get(req.userId) ?? 0) + daysWithinYear(req, year));
  }

  return Object.fromEntries(
    userIds.map((userId) => {
      const allowance = overrideByUser.get(userId) ?? teamAllowanceByUser.get(userId) ?? 25;
      const used = usedByUser.get(userId) ?? 0;
      return [userId, { allowance, used, remaining: Math.max(0, allowance - used) }];
    })
  );
}

export async function calculateRequestDaysForUser(
  userId: string,
  startDate: Date,
  endDate: Date,
  duration: RequestDuration,
  db: Db = prisma
): Promise<{ ok: true; days: number } | { ok: false; error: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { holidayCountryCode: true },
  });

  const holidayDates = user?.holidayCountryCode
    ? await getPublicHolidayDateSet(user.holidayCountryCode, startDate, endDate)
    : new Set<string>();

  return calculateRequestDays(startDate, endDate, duration, holidayDates);
}

export async function validateRequestDays(
  userId: string,
  startDate: Date,
  endDate: Date,
  excludeRequestId?: string,
  duration: RequestDuration = "full",
  db: Db = prisma
): Promise<{ ok: true; days: number } | { ok: false; error: string }> {
  if (startDate.getFullYear() !== endDate.getFullYear()) {
    return {
      ok: false,
      error:
        "Requests cannot span two calendar years. Please submit separate requests for each year.",
    };
  }

  const calculated = await calculateRequestDaysForUser(userId, startDate, endDate, duration, db);
  if (!calculated.ok) return calculated;

  const { days } = calculated;
  const year = startDate.getFullYear();
  const { remaining } = await getRemainingDays(userId, year, db);

  let adjustedRemaining = remaining;
  if (excludeRequestId) {
    const existing = await db.vacationRequest.findUnique({
      where: { id: excludeRequestId },
    });
    if (existing?.status === "APPROVED") {
      adjustedRemaining += daysWithinYear(existing, year);
    }
  }

  // Pending requests reserve allowance so a user can't queue up more time
  // off than they have left. The request under review is excluded.
  const pendingDays = await getPendingDays(userId, year, db, excludeRequestId);
  adjustedRemaining -= pendingDays;

  if (days > adjustedRemaining) {
    const remainingLabel = Number.isInteger(adjustedRemaining)
      ? `${adjustedRemaining}`
      : adjustedRemaining.toFixed(1);
    const pendingNote =
      pendingDays > 0 ? ` (${pendingDays} day(s) are reserved by pending requests)` : "";
    return {
      ok: false,
      error: `Not enough allowance. You have ${remainingLabel} day(s) available${pendingNote}.`,
    };
  }

  const overlap = await db.vacationRequest.findFirst({
    where: {
      userId,
      id: excludeRequestId ? { not: excludeRequestId } : undefined,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  if (overlap) {
    return { ok: false, error: "These dates overlap with an existing request." };
  }

  return { ok: true, days };
}
