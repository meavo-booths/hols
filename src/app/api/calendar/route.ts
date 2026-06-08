import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
          teamMemberships: { include: { team: true } },
        },
      },
    },
    orderBy: { startDate: "asc" },
  });

  const events = requests.map((req) => {
    const teams = req.user.teamMemberships.map((m) => m.team.name).join(", ");
    return {
      id: req.id,
      title: `${req.user.name ?? req.user.email} — off`,
      start: req.startDate.toISOString().slice(0, 10),
      end: new Date(req.endDate.getTime() + 86400000).toISOString().slice(0, 10),
      extendedProps: {
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        teams,
        days: req.days,
        note: req.note,
      },
    };
  });

  return NextResponse.json(events);
}
