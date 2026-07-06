import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VACATION_TRACKER_CARD_ID } from "@/lib/vacation-tracker";

export type HolsSessionUser = NonNullable<Session["user"]> & { id: string };

export const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Please sign in again.";
export const HOLS_ACCESS_REVOKED_MESSAGE =
  "You no longer have access to Vacation Tracker. Ask your admin to grant access on meavo.app.";

export type HolsUserResult =
  | { ok: true; user: HolsSessionUser }
  | { ok: false; error: string };

/**
 * Verifies the session user still has Vacation Tracker access on every
 * request (not just at login), so revoking a tool card in the gateway takes
 * effect immediately instead of when the JWT expires. Admins always pass.
 */
export async function getHolsUser(): Promise<HolsUserResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: SESSION_EXPIRED_MESSAGE };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { systemRole: true },
  });
  if (!user) {
    return { ok: false, error: SESSION_EXPIRED_MESSAGE };
  }
  if (user.systemRole === "ADMIN") {
    return { ok: true, user: session.user as HolsSessionUser };
  }

  const access = await prisma.toolCardAccess.findUnique({
    where: {
      userId_cardId: { userId: session.user.id, cardId: VACATION_TRACKER_CARD_ID },
    },
  });
  if (!access) {
    return { ok: false, error: HOLS_ACCESS_REVOKED_MESSAGE };
  }

  return { ok: true, user: session.user as HolsSessionUser };
}

export async function requireHolsUser(): Promise<HolsSessionUser> {
  const result = await getHolsUser();
  if (!result.ok) {
    throw new Error(
      result.error === HOLS_ACCESS_REVOKED_MESSAGE ? "Forbidden" : "Unauthorized"
    );
  }
  return result.user;
}
