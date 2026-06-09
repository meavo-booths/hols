import { DEFAULT_TEAM_COLOR, isValidTeamColor } from "@/lib/team-colors";
import { prisma } from "@/lib/prisma";
import { unauthorizedResponse, verifyGatewaySync } from "@/lib/gateway-sync-auth";

type TeamSyncBody = {
  gatewayTeamId?: string;
  name?: string;
  color?: string;
  yearlyAllowance?: number;
};

export async function POST(request: Request) {
  if (!verifyGatewaySync(request)) return unauthorizedResponse();

  let body: TeamSyncBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const gatewayTeamId = body.gatewayTeamId?.trim();
  const name = body.name?.trim();
  const color = isValidTeamColor(body.color ?? "") ? body.color! : DEFAULT_TEAM_COLOR;
  const yearlyAllowance = Number(body.yearlyAllowance);

  if (!gatewayTeamId || !name) {
    return Response.json({ error: "gatewayTeamId and name are required" }, { status: 400 });
  }

  if (!Number.isFinite(yearlyAllowance) || yearlyAllowance < 0) {
    return Response.json({ error: "Invalid yearlyAllowance" }, { status: 400 });
  }

  const existing = await prisma.team.findUnique({ where: { gatewayTeamId } });

  if (existing) {
    const team = await prisma.team.update({
      where: { id: existing.id },
      data: { name, color, yearlyAllowance },
    });
    return Response.json({ ok: true, teamId: team.id });
  }

  const byName = await prisma.team.findUnique({ where: { name } });
  if (byName) {
    const team = await prisma.team.update({
      where: { id: byName.id },
      data: { gatewayTeamId, color, yearlyAllowance },
    });
    return Response.json({ ok: true, teamId: team.id, linked: true });
  }

  const team = await prisma.team.create({
    data: { gatewayTeamId, name, color, yearlyAllowance },
  });

  return Response.json({ ok: true, teamId: team.id, created: true });
}
