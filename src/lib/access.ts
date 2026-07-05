import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VACATION_TRACKER_CARD_ID } from "@/lib/vacation-tracker";

/**
 * Verifies the session user still has Vacation Tracker access on every
 * request (not just at login), so revoking a tool card in the gateway takes
 * effect immediately instead of when the JWT expires. Admins always pass.
 */
export async function requireHolsUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { systemRole: true },
  });
  if (!user) throw new Error("Unauthorized");
  if (user.systemRole === "ADMIN") return session.user;

  const access = await prisma.toolCardAccess.findUnique({
    where: {
      userId_cardId: { userId: session.user.id, cardId: VACATION_TRACKER_CARD_ID },
    },
  });
  if (!access) throw new Error("Forbidden");

  return session.user;
}
