import { prisma } from "@/lib/prisma";
import { calculateRequestDays } from "@/lib/dates";
import type { RequestDuration } from "@/lib/days-format";

export async function getYearlyAllowance(userId: string, year: number): Promise<number> {
  const individual = await prisma.userAllowance.findUnique({
    where: { userId_year: { userId, year } },
  });
  if (individual) return individual.days;

  const membership = await prisma.teamMember.findFirst({
    where: { userId },
    include: { team: true },
    orderBy: { createdAt: "asc" },
  });
  if (membership) return membership.team.yearlyAllowance;

  return 25;
}

export async function getUsedDays(userId: string, year: number): Promise<number> {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59);

  const approved = await prisma.vacationRequest.findMany({
    where: {
      userId,
      status: "APPROVED",
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });

  return approved.reduce((sum, req) => sum + req.days, 0);
}

export async function getRemainingDays(userId: string, year: number): Promise<{
  allowance: number;
  used: number;
  remaining: number;
}> {
  const allowance = await getYearlyAllowance(userId, year);
  const used = await getUsedDays(userId, year);
  return { allowance, used, remaining: Math.max(0, allowance - used) };
}

export async function validateRequestDays(
  userId: string,
  startDate: Date,
  endDate: Date,
  excludeRequestId?: string,
  duration: RequestDuration = "full"
): Promise<{ ok: true; days: number } | { ok: false; error: string }> {
  const calculated = calculateRequestDays(startDate, endDate, duration);
  if (!calculated.ok) return calculated;

  const { days } = calculated;
  const year = startDate.getFullYear();
  const { remaining } = await getRemainingDays(userId, year);

  let adjustedRemaining = remaining;
  if (excludeRequestId) {
    const existing = await prisma.vacationRequest.findUnique({
      where: { id: excludeRequestId },
    });
    if (existing?.status === "APPROVED" && existing.startDate.getFullYear() === year) {
      adjustedRemaining += existing.days;
    }
  }

  const remainingLabel = Number.isInteger(adjustedRemaining)
    ? `${adjustedRemaining}`
    : adjustedRemaining.toFixed(1);

  if (days > adjustedRemaining) {
    return {
      ok: false,
      error: `Not enough allowance. You have ${remainingLabel} day(s) remaining.`,
    };
  }

  const overlap = await prisma.vacationRequest.findFirst({
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
