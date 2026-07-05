import { NextResponse } from "next/server";
import { requireHolsUser } from "@/lib/access";
import { isValidHolidayCountryCode } from "@/lib/holiday-country-options";
import { prisma } from "@/lib/prisma";
import {
  getCachedPublicHolidaysInRange,
  publicHolidayCalendarEvents,
} from "@/lib/public-holidays";
import { resolveTeamColor, TEAM_EVENT_TEXT_COLOR } from "@/lib/team-colors";

export async function GET(request: Request) {
  try {
    await requireHolsUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const teamId = searchParams.get("teamId");
  const countryCode = searchParams.get("countryCode");

  const where: {
    status: "APPROVED";
    startDate?: { lte: Date };
    endDate?: { gte: Date };
    user?: { teamMembers: { some: { teamId: string } } };
  } = { status: "APPROVED" };

  if (start && end) {
    where.startDate = { lte: new Date(end) };
    where.endDate = { gte: new Date(start) };
  }

  if (teamId) {
    where.user = { teamMembers: { some: { teamId } } };
  }

  const requests = await prisma.vacationRequest.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          teamMembers: {
            include: { team: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
    orderBy: { startDate: "asc" },
  });

  const leaveEvents = requests.map((req) => {
    const memberships = req.user.teamMembers;
    const primaryMembership = teamId
      ? memberships.find((m) => m.teamId === teamId) ?? memberships[0]
      : memberships[0];
    const color = resolveTeamColor(primaryMembership?.team.color);
    const teams = memberships.map((m) => m.team.name).join(", ");

    return {
      id: req.id,
      title: `${req.user.name ?? req.user.email} — off${req.days === 0.5 ? " (½)" : ""}`,
      start: req.startDate.toISOString().slice(0, 10),
      end: new Date(req.endDate.getTime() + 86400000).toISOString().slice(0, 10),
      backgroundColor: color,
      borderColor: color,
      textColor: TEAM_EVENT_TEXT_COLOR,
      extendedProps: {
        kind: "leave" as const,
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        teams,
        days: req.days,
        note: req.note,
        color,
      },
    };
  });

  if (!countryCode || !isValidHolidayCountryCode(countryCode) || !start || !end) {
    return NextResponse.json(leaveEvents);
  }

  const rangeStart = new Date(start);
  const rangeEnd = new Date(end);
  // Cached read only — the sync-holidays cron keeps the cache warm, so the
  // calendar GET never blocks on the external holidays API.
  const holidays = await getCachedPublicHolidaysInRange(countryCode, rangeStart, rangeEnd);
  const holidayEvents = publicHolidayCalendarEvents(countryCode, holidays);

  return NextResponse.json([...holidayEvents, ...leaveEvents]);
}
