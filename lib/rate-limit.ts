/**
 * In-memory sliding-window rate limiter.
 *
 * Single-instance friendly (per-process). On horizontally scaled deploys swap
 * the store for Redis/Upstash — the call sites don't change. Windows are kept
 * per key; stale buckets are pruned lazily on access to bound memory usage.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;
const MAX_BUCKETS = 50_000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    const alive = bucket.hits.some((t) => t > now - 60 * 60_000);
    if (!alive) buckets.delete(key);
  }
  // Hard cap: drop oldest keys (Map preserves insertion order)
  while (buckets.size > MAX_BUCKETS) {
    const first = buckets.keys().next();
    if (first.done) break;
    buckets.delete(first.value);
  }
}

export interface RateLimitOptions {
  /** Logical bucket name, e.g. "register" or "mp-webhook". */
  name: string;
  /** Client identity (ip, user id, email...). */
  identity: string;
  /** Max requests inside the window. */
  limit: number;
  /** Window duration in ms. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit({
  name,
  identity,
  limit,
  windowMs
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const key = `${name}:${identity}`;
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => t > now - windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterSeconds };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return {
    ok: true,
    remaining: limit - bucket.hits.length,
    retryAfterSeconds: 0
  };
}

/**
 * Best-effort client ip extraction. Trusting proxy headers is fine for
 * servers behind a reverse proxy / tunnel (the only ways this app is
 * exposed), and harmless locally.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Standard 429 response with Retry-After header. */
export function tooManyRequests(res: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error:
        "Demasiados intentos. Esperá unos minutos y volvé a probarlo."
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(res.retryAfterSeconds)
      }
    }
  );
}
