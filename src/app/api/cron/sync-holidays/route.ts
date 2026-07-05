import { NextRequest, NextResponse } from "next/server";
import { syncPublicHolidays } from "@/lib/public-holidays";

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { countries, years } = await syncPublicHolidays();
    return NextResponse.json({ ok: true, countries, years });
  } catch (error) {
    console.error("Public holiday sync cron failed:", error);
    return NextResponse.json({ error: "Holiday sync failed" }, { status: 500 });
  }
}
