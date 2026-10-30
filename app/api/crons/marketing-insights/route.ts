import { NextResponse } from "next/server";
import { runInsightsSync } from "@/lib/marketing/insights";
import { isCronAuthorized } from "@/lib/marketing/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

// GET/POST /api/crons/marketing-insights
// Vercel Cron entry for the daily insights snapshot (per-post metrics + AP
// followers). Same authorization scheme as the publish queue.
async function handle(request: Request): Promise<NextResponse> {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const outcome = await runInsightsSync();
    return NextResponse.json({
      ok: true,
      postsSynced: outcome.postsSynced,
      postsFailed: outcome.postsFailed,
      followers: outcome.followers,
      syncedAt: outcome.syncedAt.toISOString(),
    });
  } catch (error) {
    console.error("[crons/marketing-insights]", error);
    return NextResponse.json(
      { ok: false, error: "Fallo del sync de insights" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  return handle(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return handle(request);
}
