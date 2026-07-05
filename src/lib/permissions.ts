import { prisma } from "@/lib/prisma";
import { TeamRole } from "@prisma/client";

export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { systemRole: true },
  });
  return user?.systemRole === "ADMIN";
}

export async function isTeamManager(userId: string, teamId: string): Promise<boolean> {
  const membership = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  return membership?.role === TeamRole.MANAGER;
}

export async function getManagedTeamIds(userId: string): Promise<string[]> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId, role: TeamRole.MANAGER },
    select: { teamId: true },
  });
  return memberships.map((m) => m.teamId);
}

export async function canReviewRequest(
  reviewerId: string,
  requesterId: string
): Promise<boolean> {
  // Nobody may review their own request, including admins.
  if (reviewerId === requesterId) return false;

  if (await isAdmin(reviewerId)) return true;

  const requesterTeams = await prisma.teamMember.findMany({
    where: { userId: requesterId },
    select: { teamId: true },
  });

  for (const { teamId } of requesterTeams) {
    if (await isTeamManager(reviewerId, teamId)) return true;
  }

  return false;
}
