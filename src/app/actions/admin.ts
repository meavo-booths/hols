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

export async function createUser(formData: FormData) {
  await requireAdmin();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim() || null;
  const password = formData.get("password") as string;
  const makeAdmin = formData.get("makeAdmin") === "on";

  if (!email) return { error: "Email is required." };
  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A user with this email already exists." };

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      systemRole: makeAdmin ? SystemRole.ADMIN : SystemRole.USER,
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function resetUserPassword(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const password = formData.get("password") as string;

  if (!userId) return { error: "User is required." };
  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function createTeam(formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  const yearlyAllowance = Number(formData.get("yearlyAllowance"));

  if (!name) return { error: "Team name is required." };
  if (!Number.isFinite(yearlyAllowance) || yearlyAllowance < 0) {
    return { error: "Allowance must be a non-negative number." };
  }

  try {
    await prisma.team.create({ data: { name, yearlyAllowance } });
  } catch {
    return { error: "A team with that name already exists." };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function updateTeamAllowance(teamId: string, yearlyAllowance: number) {
  await requireAdmin();
  if (!Number.isFinite(yearlyAllowance) || yearlyAllowance < 0) {
    return { error: "Invalid allowance." };
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { yearlyAllowance },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function addTeamMember(formData: FormData) {
  await requireAdmin();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const teamId = formData.get("teamId") as string;
  const role = (formData.get("role") as string) === "MANAGER" ? TeamRole.MANAGER : TeamRole.MEMBER;

  if (!email || !teamId) return { error: "Email and team are required." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "User not found. Create the user account in Admin first." };
  }

  try {
    await prisma.teamMember.create({
      data: { userId: user.id, teamId, role },
    });
  } catch {
    return { error: "User is already on this team." };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function removeTeamMember(memberId: string) {
  await requireAdmin();
  await prisma.teamMember.delete({ where: { id: memberId } });
  revalidatePath("/admin");
  return { success: true };
}

export async function setUserAllowance(formData: FormData) {
  await requireAdmin();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const year = Number(formData.get("year"));
  const days = Number(formData.get("days"));

  if (!email || !Number.isFinite(year) || !Number.isFinite(days) || days < 0) {
    return { error: "Valid email, year, and days are required." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "User not found." };

  await prisma.userAllowance.upsert({
    where: { userId_year: { userId: user.id, year } },
    update: { days },
    create: { userId: user.id, year, days },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function clearUserAllowance(allowanceId: string) {
  await requireAdmin();
  await prisma.userAllowance.delete({ where: { id: allowanceId } });
  revalidatePath("/admin");
  return { success: true };
}
