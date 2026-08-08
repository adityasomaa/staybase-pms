import { NextResponse } from "next/server";

import { isChannexConfigured } from "@/lib/channex/client";
import { isDatabaseConfigured } from "@/db";

export const dynamic = "force-dynamic";

/** Lightweight readiness probe for uptime monitors and the Vercel cron job. */
export async function GET() {
  return NextResponse.json({
    service: "staybase-pms",
    status: "ok",
    channex: isChannexConfigured() ? "configured" : "dry-run",
    database: isDatabaseConfigured() ? "connected" : "demo-dataset",
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    region: process.env.VERCEL_REGION ?? null,
  });
}
