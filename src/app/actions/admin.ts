"use server";

import { revalidatePath } from "next/cache";
import { getHolsUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

async function getAdminUser() {
  const access = await getHolsUser();
  if (!access.ok) return access;
  if (!(await isAdmin(access.user.id))) {
    return { ok: false as const, error: "You are not allowed to perform this action." };
  }
  return { ok: true as const, user: access.user };
}

export async function setUserAllowance(formData: FormData): Promise<void> {
  const access = await getAdminUser();
  if (!access.ok) return;
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const year = Number(formData.get("year"));
  const daysRaw = (formData.get("days") as string)?.trim() ?? "";
  const hasDaysOverride = daysRaw !== "";
  const days = hasDaysOverride ? Number(daysRaw) : null;
  const holidayCountryCode = (formData.get("holidayCountryCode") as string)?.trim() || null;

  if (!email) return;
  if (hasDaysOverride) {
    if (!Number.isFinite(year) || days === null || !Number.isFinite(days) || days < 0) return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  if (hasDaysOverride && Number.isFinite(year) && days !== null) {
    await prisma.$transaction([
      prisma.userAllowance.upsert({
        where: { userId_year: { userId: user.id, year } },
        update: { days },
        create: { userId: user.id, year, days },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { holidayCountryCode },
      }),
    ]);
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { holidayCountryCode },
    });
  }

  revalidatePath("/admin");
}

export async function clearUserAllowance(allowanceId: string): Promise<void> {
  const access = await getAdminUser();
  if (!access.ok) return;
  await prisma.userAllowance.delete({ where: { id: allowanceId } });
  revalidatePath("/admin");
}
