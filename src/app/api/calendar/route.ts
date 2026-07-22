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
  const teamIds = searchParams.getAll("teamId").filter(Boolean);
  const countryCodes = searchParams
    .getAll("countryCode")
    .filter((code) => isValidHolidayCountryCode(code));

  const where: {
    status: "APPROVED";
    startDate?: { lte: Date };
    endDate?: { gte: Date };
    user?: { teamMembers: { some: { teamId: { in: string[] } } } };
  } = { status: "APPROVED" };

  if (start && end) {
    where.startDate = { lte: new Date(end) };
    where.endDate = { gte: new Date(start) };
  }

  if (teamIds.length > 0) {
    where.user = { teamMembers: { some: { teamId: { in: teamIds } } } };
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

  const selectedTeamIds = new Set(teamIds);

  const leaveEvents = requests.map((req) => {
    const memberships = req.user.teamMembers;
    const primaryMembership =
      teamIds.length > 0
        ? memberships.find((m) => selectedTeamIds.has(m.teamId)) ?? memberships[0]
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

  if (countryCodes.length === 0 || !start || !end) {
    return NextResponse.json(leaveEvents);
  }

  const rangeStart = new Date(start);
  const rangeEnd = new Date(end);
  // Cached read only — the sync-holidays cron keeps the cache warm, so the
  // calendar GET never blocks on the external holidays API.
  const holidayEventLists = await Promise.all(
    countryCodes.map(async (countryCode) => {
      const holidays = await getCachedPublicHolidaysInRange(countryCode, rangeStart, rangeEnd);
      return publicHolidayCalendarEvents(countryCode, holidays);
    })
  );

  return NextResponse.json([...holidayEventLists.flat(), ...leaveEvents]);
}
