"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!(await isAdmin(session.user.id))) throw new Error("Forbidden");
  return session.user;
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
