import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export const THROTTLE_ERROR =
  "Too many failed attempts. Please wait 15 minutes and try again.";

/** Returns true when the key is currently locked out. */
export async function isLoginThrottled(key: string): Promise<boolean> {
  const row = await prisma.loginThrottle.findUnique({ where: { key } });
  if (!row) return false;

  if (Date.now() - row.windowStart.getTime() > WINDOW_MS) return false;
  return row.attempts >= MAX_ATTEMPTS;
}

/** Records a failed attempt, starting a fresh window if the old one expired. */
export async function recordLoginFailure(key: string): Promise<void> {
  const now = new Date();
  const row = await prisma.loginThrottle.findUnique({ where: { key } });

  if (!row || now.getTime() - row.windowStart.getTime() > WINDOW_MS) {
    await prisma.loginThrottle.upsert({
      where: { key },
      create: { key, attempts: 1, windowStart: now },
      update: { attempts: 1, windowStart: now },
    });
    return;
  }

  await prisma.loginThrottle.update({
    where: { key },
    data: { attempts: { increment: 1 } },
  });
}

/** Clears the throttle after a successful login. */
export async function clearLoginThrottle(key: string): Promise<void> {
  await prisma.loginThrottle.deleteMany({ where: { key } });
}
