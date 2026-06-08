import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const users = await prisma.user.count();
    const teams = await prisma.team.count();

    return NextResponse.json({
      ok: true,
      database: "connected",
      users,
      teams,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        database: "error",
        message,
      },
      { status: 500 }
    );
  }
}
