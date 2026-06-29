import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type EnqueueNotificationInput = {
  sourceApp: string;
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
};

export async function enqueueNotification(input: EnqueueNotificationInput): Promise<void> {
  try {
    await prisma.notificationOutbox.create({
      data: {
        sourceApp: input.sourceApp,
        eventType: input.eventType,
        idempotencyKey: input.idempotencyKey ?? null,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (
      input.idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }
}
