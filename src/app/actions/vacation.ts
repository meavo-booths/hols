"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getHolsUser } from "@/lib/access";
import { parseDateInput } from "@/lib/dates";
import type { RequestDuration } from "@/lib/days-format";
import { inferRequestDuration } from "@/lib/days-format";
import { validateRequestDays } from "@/lib/allowance";
import { canReviewRequest } from "@/lib/permissions";
import { notifySlackNewVacationRequest } from "@/lib/slack";
import { enqueueNotification } from "@/lib/notifications/enqueue";

export async function createVacationRequest(formData: FormData) {
  const access = await getHolsUser();
  if (!access.ok) return { error: access.error };
  const user = access.user;
  const duration = (formData.get("duration") as RequestDuration) === "half" ? "half" : "full";
  const startDate = parseDateInput(formData.get("startDate") as string);
  const endDate =
    duration === "half"
      ? startDate
      : parseDateInput(formData.get("endDate") as string);
  const note = (formData.get("note") as string) || null;

  // Serializable transaction: validation and insert are atomic, so two
  // concurrent submissions can't both pass the allowance/overlap checks.
  let outcome: { error: string } | { request: { id: string } };
  try {
    outcome = await prisma.$transaction(
      async (tx) => {
        const validation = await validateRequestDays(
          user.id,
          startDate,
          endDate,
          undefined,
          duration,
          tx
        );
        if (!validation.ok) return { error: validation.error };

        const request = await tx.vacationRequest.create({
          data: {
            userId: user.id,
            startDate,
            endDate,
            days: validation.days,
            note,
          },
        });
        return { request };
      },
      { isolationLevel: "Serializable" }
    );
  } catch (err) {
    console.error("Vacation request creation failed:", err);
    return { error: "Could not submit the request. Please try again." };
  }

  if ("error" in outcome) return { error: outcome.error };
  const { request } = outcome;

  void notifySlackNewVacationRequest(request.id).catch((err) => {
    console.error("Slack notification failed:", err);
  });

  void enqueueNotification({
    sourceApp: "hols",
    eventType: "hols.vacation.requested",
    idempotencyKey: `hols:vacation:requested:${request.id}`,
    payload: { requestId: request.id },
  }).catch((err) => {
    console.error("Notification enqueue failed:", err);
  });

  revalidatePath("/");
  revalidatePath("/requests");
  revalidatePath("/approvals");
  return { success: true };
}

export async function cancelVacationRequest(requestId: string): Promise<void> {
  const access = await getHolsUser();
  if (!access.ok) return;
  const user = access.user;
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
  const access = await getHolsUser();
  if (!access.ok) return { error: access.error };
  const user = access.user;

  const request = await prisma.vacationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request || request.status !== "PENDING") {
    return { error: "Request not found or already reviewed." };
  }

  const allowed = await canReviewRequest(user.id, request.userId);
  if (!allowed) return { error: "You are not allowed to review this request." };

  // Serializable transaction: re-check the request is still PENDING and
  // re-validate allowance atomically, so concurrent approvals can't
  // double-approve or overshoot the allowance.
  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        const fresh = await tx.vacationRequest.findUnique({ where: { id: requestId } });
        if (!fresh || fresh.status !== "PENDING") {
          return { error: "Request not found or already reviewed." };
        }

        if (action === "approve") {
          const duration = inferRequestDuration(fresh.startDate, fresh.endDate, fresh.days);
          const validation = await validateRequestDays(
            fresh.userId,
            fresh.startDate,
            fresh.endDate,
            requestId,
            duration,
            tx
          );
          if (!validation.ok) return { error: validation.error };
        }

        await tx.vacationRequest.update({
          where: { id: requestId },
          data: {
            status: action === "approve" ? "APPROVED" : "REJECTED",
            reviewedById: user.id,
            reviewedAt: new Date(),
            reviewNote: reviewNote || null,
          },
        });
        return { success: true as const };
      },
      { isolationLevel: "Serializable" }
    );
    if ("error" in outcome) return { error: outcome.error };
  } catch (err) {
    console.error("Vacation request review failed:", err);
    return { error: "Could not process the review. Please try again." };
  }

  void enqueueNotification({
    sourceApp: "hols",
    eventType: action === "approve" ? "hols.vacation.approved" : "hols.vacation.rejected",
    idempotencyKey: `hols:vacation:${action}:${requestId}`,
    payload: { requestId },
  }).catch((err) => {
    console.error("Notification enqueue failed:", err);
  });

  revalidatePath("/");
  revalidatePath("/approvals");
  revalidatePath("/requests");
  return { success: true };
}

export async function managerRevokeVacationRequest(requestId: string): Promise<void> {
  const access = await getHolsUser();
  if (!access.ok) return;
  const user = access.user;
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
