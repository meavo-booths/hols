"use server";

import { revalidatePath } from "next/cache";
import { SystemRole, TeamRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { isAdmin } from "@/lib/permissions";
import { DEFAULT_TEAM_COLOR, isValidTeamColor } from "@/lib/team-colors";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!(await isAdmin(session.user.id))) throw new Error("Forbidden");
  return session.user;
}

export async function createUser(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim() || null;
  const password = formData.get("password") as string;
  const makeAdmin = formData.get("makeAdmin") === "on";
  const teamId = formData.get("teamId") as string;
  const role =
    (formData.get("role") as string) === "MANAGER" ? TeamRole.MANAGER : TeamRole.MEMBER;

  if (!email || !teamId) return;
  if (!password || password.length < 8) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        systemRole: makeAdmin ? SystemRole.ADMIN : SystemRole.USER,
      },
    });

    await tx.teamMember.create({
      data: { userId: user.id, teamId, role },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteUser(userId: string): Promise<void> {
  const session = await requireAdmin();
  if (!userId || userId === session.id) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { systemRole: true },
  });
  if (!user) return;

  if (user.systemRole === SystemRole.ADMIN) {
    const adminCount = await prisma.user.count({
      where: { systemRole: SystemRole.ADMIN },
    });
    if (adminCount <= 1) return;
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
}

export async function resetUserPassword(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const password = formData.get("password") as string;

  if (!userId) return;
  if (!password || password.length < 8) return;

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });

  revalidatePath("/admin");
}

export async function createTeam(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  const yearlyAllowance = Number(formData.get("yearlyAllowance"));
  const colorInput = (formData.get("color") as string) ?? DEFAULT_TEAM_COLOR;
  const color = isValidTeamColor(colorInput) ? colorInput : DEFAULT_TEAM_COLOR;

  if (!name) return;
  if (!Number.isFinite(yearlyAllowance) || yearlyAllowance < 0) return;

  try {
    await prisma.team.create({ data: { name, yearlyAllowance, color } });
  } catch {
    return;
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateTeam(formData: FormData): Promise<void> {
  await requireAdmin();
  const teamId = formData.get("teamId") as string;
  const name = (formData.get("name") as string)?.trim();
  const colorInput = (formData.get("color") as string) ?? DEFAULT_TEAM_COLOR;
  const color = isValidTeamColor(colorInput) ? colorInput : DEFAULT_TEAM_COLOR;

  if (!teamId || !name) return;

  try {
    await prisma.team.update({
      where: { id: teamId },
      data: { name, color },
    });
  } catch {
    return;
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateTeamAllowance(
  teamId: string,
  yearlyAllowance: number
): Promise<void> {
  await requireAdmin();
  if (!Number.isFinite(yearlyAllowance) || yearlyAllowance < 0) return;

  await prisma.team.update({
    where: { id: teamId },
    data: { yearlyAllowance },
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function changeUserTeam(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const teamId = formData.get("teamId") as string;
  const role =
    (formData.get("role") as string) === "MANAGER" ? TeamRole.MANAGER : TeamRole.MEMBER;

  if (!userId || !teamId) return;

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.deleteMany({ where: { userId } });
    await tx.teamMember.create({
      data: { userId, teamId, role },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function removeTeamMember(memberId: string): Promise<void> {
  await requireAdmin();
  await prisma.teamMember.delete({ where: { id: memberId } });
  revalidatePath("/admin");
}

export async function setUserAllowance(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const year = Number(formData.get("year"));
  const days = Number(formData.get("days"));

  if (!email || !Number.isFinite(year) || !Number.isFinite(days) || days < 0) return;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  await prisma.userAllowance.upsert({
    where: { userId_year: { userId: user.id, year } },
    update: { days },
    create: { userId: user.id, year, days },
  });

  revalidatePath("/admin");
}

export async function clearUserAllowance(allowanceId: string): Promise<void> {
  await requireAdmin();
  await prisma.userAllowance.delete({ where: { id: allowanceId } });
  revalidatePath("/admin");
}
