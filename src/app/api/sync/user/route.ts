import { SystemRole, TeamRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { unauthorizedResponse, verifyGatewaySync } from "@/lib/gateway-sync-auth";

type UserSyncBody = {
  email?: string;
  name?: string | null;
  passwordHash?: string;
  teamGatewayId?: string;
  role?: string;
};

export async function POST(request: Request) {
  if (!verifyGatewaySync(request)) return unauthorizedResponse();

  let body: UserSyncBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const passwordHash = body.passwordHash;
  const teamGatewayId = body.teamGatewayId?.trim();
  const role = body.role === "MANAGER" ? TeamRole.MANAGER : TeamRole.MEMBER;

  if (!email || !passwordHash || !teamGatewayId) {
    return Response.json(
      { error: "email, passwordHash, and teamGatewayId are required" },
      { status: 400 }
    );
  }

  const team = await prisma.team.findUnique({ where: { gatewayTeamId: teamGatewayId } });
  if (!team) {
    return Response.json({ error: "Team not found — sync team first" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: body.name ?? null,
      passwordHash,
    },
    create: {
      email,
      name: body.name ?? null,
      passwordHash,
      systemRole: SystemRole.USER,
    },
  });

  await prisma.teamMember.deleteMany({ where: { userId: user.id } });
  await prisma.teamMember.create({
    data: {
      userId: user.id,
      teamId: team.id,
      role,
    },
  });

  return Response.json({ ok: true, userId: user.id });
}
