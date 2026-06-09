"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateInput } from "@/lib/dates";
import type { RequestDuration } from "@/lib/days-format";
import { inferRequestDuration } from "@/lib/days-format";
import { validateRequestDays } from "@/lib/allowance";
import { canReviewRequest } from "@/lib/permissions";
import { notifySlackNewVacationRequest } from "@/lib/slack";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

export async function createVacationRequest(formData: FormData) {
  const user = await requireUser();
  const duration = (formData.get("duration") as RequestDuration) === "half" ? "half" : "full";
  const startDate = parseDateInput(formData.get("startDate") as string);
  const endDate =
    duration === "half"
      ? startDate
      : parseDateInput(formData.get("endDate") as string);
  const note = (formData.get("note") as string) || null;

  const validation = await validateRequestDays(user.id, startDate, endDate, undefined, duration);
  if (!validation.ok) return { error: validation.error };

  const request = await prisma.vacationRequest.create({
    data: {
      userId: user.id,
      startDate,
      endDate,
      days: validation.days,
      note,
    },
  });

  void notifySlackNewVacationRequest(request.id).catch((err) => {
    console.error("Slack notification failed:", err);
  });

  revalidatePath("/");
  revalidatePath("/requests");
  revalidatePath("/approvals");
  return { success: true };
}

export async function cancelVacationRequest(requestId: string): Promise<void> {
  const user = await requireUser();
  const request = await prisma.vacationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request || request.userId !== user.id) return;
  if (request.status !== "PENDING") return;

  await prisma.vacationRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/");
  revalidatePath("/requests");
}

export async function reviewVacationRequest(
  requestId: string,
  action: "approve" | "reject",
  reviewNote?: string
) {
  const user = await requireUser();
  const request = await prisma.vacationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request || request.status !== "PENDING") {
    return { error: "Request not found or already reviewed." };
  }

  const allowed = await canReviewRequest(user.id, request.userId);
  if (!allowed) return { error: "You are not allowed to review this request." };

  if (action === "approve") {
    const duration = inferRequestDuration(
      request.startDate,
      request.endDate,
      request.days
    );
    const validation = await validateRequestDays(
      request.userId,
      request.startDate,
      request.endDate,
      requestId,
      duration
    );
    if (!validation.ok) return { error: validation.error };
  }

  await prisma.vacationRequest.update({
    where: { id: requestId },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      reviewedById: user.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/approvals");
  revalidatePath("/requests");
  return { success: true };
}

export async function managerRevokeVacationRequest(requestId: string): Promise<void> {
  const user = await requireUser();
  const request = await prisma.vacationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) return;
  if (request.status !== "APPROVED" && request.status !== "REJECTED") return;

  const allowed = await canReviewRequest(user.id, request.userId);
  if (!allowed) return;

  await prisma.vacationRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/");
  revalidatePath("/approvals");
  revalidatePath("/requests");
}
