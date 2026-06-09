import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveTeamColor, TEAM_EVENT_TEXT_COLOR } from "@/lib/team-colors";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const teamId = searchParams.get("teamId");

  const where: {
    status: "APPROVED";
    startDate?: { lte: Date };
    endDate?: { gte: Date };
    user?: { teamMemberships: { some: { teamId: string } } };
  } = { status: "APPROVED" };

  if (start && end) {
    where.startDate = { lte: new Date(end) };
    where.endDate = { gte: new Date(start) };
  }

  if (teamId) {
    where.user = { teamMemberships: { some: { teamId } } };
  }

  const requests = await prisma.vacationRequest.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          teamMemberships: {
            include: { team: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
    orderBy: { startDate: "asc" },
  });

  const events = requests.map((req) => {
    const memberships = req.user.teamMemberships;
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

  return NextResponse.json(events);
}
