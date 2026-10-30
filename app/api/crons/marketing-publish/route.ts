import { NextResponse } from "next/server";
import { runPublishQueue } from "@/lib/marketing/publisher";
import { isCronAuthorized } from "@/lib/marketing/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

// GET/POST /api/crons/marketing-publish
// Vercel Cron entry for the scheduled publishing queue. Authorized via
// `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sets it automatically
// when the env var exists) or the x-vercel-cron header. Manual runs from the
// admin UI go through the guarded server action instead.

async function handle(request: Request): Promise<NextResponse> {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const outcome = await runPublishQueue();
    return NextResponse.json({ ok: true, ...outcome });
  } catch (error) {
    console.error("[crons/marketing-publish]", error);
    return NextResponse.json(
      { ok: false, error: "Fallo del queue de publicación" },
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
