import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const users = await prisma.user.count();
    const teams = await prisma.team.count();

    let vacationRequests: number | null = null;
    let vacationSchemaReady = true;
    try {
      vacationRequests = await prisma.vacationRequest.count();
    } catch (error) {
      vacationSchemaReady = false;
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        {
          ok: false,
          database: "connected",
          users,
          teams,
          vacationSchemaReady: false,
          message:
            "Vacation Tracker tables are missing on this database. From the hols repo, run: npm run db:push (with the same DATABASE_URL as meavo-gateway).",
          detail: message.split("\n")[0],
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      database: "connected",
      users,
      teams,
      vacationRequests,
      vacationSchemaReady,
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
