"use server";

import { revalidatePath } from "next/cache";
import { SystemRole, TeamRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { isAdmin } from "@/lib/permissions";

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

  if (!email) return;
  if (!password || password.length < 8) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      systemRole: makeAdmin ? SystemRole.ADMIN : SystemRole.USER,
    },
  });

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

  if (!name) return;
  if (!Number.isFinite(yearlyAllowance) || yearlyAllowance < 0) return;

  try {
    await prisma.team.create({ data: { name, yearlyAllowance } });
  } catch {
    return;
  }

  revalidatePath("/admin");
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
}

export async function addTeamMember(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const teamId = formData.get("teamId") as string;
  const role = (formData.get("role") as string) === "MANAGER" ? TeamRole.MANAGER : TeamRole.MEMBER;

  if (!email || !teamId) return;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  try {
    await prisma.teamMember.create({
      data: { userId: user.id, teamId, role },
    });
  } catch {
    return;
  }

  revalidatePath("/admin");
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
