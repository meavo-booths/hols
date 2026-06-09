import { prisma } from "@/lib/prisma";
import { unauthorizedResponse, verifyGatewaySync } from "@/lib/gateway-sync-auth";

type RevokeBody = {
  email?: string;
};

export async function POST(request: Request) {
  if (!verifyGatewaySync(request)) return unauthorizedResponse();

  let body: RevokeBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return Response.json({ error: "email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return Response.json({ ok: true, skipped: true });
  }

  await prisma.$transaction([
    prisma.teamMember.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: null },
    }),
  ]);

  return Response.json({ ok: true });
}
