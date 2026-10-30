/**
 * Shared authorization for /api/crons/* routes. Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>` when the env var exists (and an
 * x-vercel-cron header). Without CRON_SECRET configured the route rejects
 * everything so the queue can't be triggered from outside.
 */
const CRON_HEADER = "x-vercel-cron";

export function isCronAuthorized(request: Request): boolean {
  if (request.headers.get(CRON_HEADER) === "1") return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authorization = request.headers.get("authorization") ?? "";
  return authorization === `Bearer ${secret}`;
}
