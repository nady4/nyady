/**
 * Post scoring (phase 5).
 *
 * Pure module: given the metrics snapshot of a published post, computes a
 * comparable "índice" so the admin can answer "qué pilar/formato funciona"
 * instead of scrolling a table of raw numbers.
 *
 * The index is intentionally transparent:
 *
 *   índice = (interacciones ponderadas / alcance) x 1000
 *
 * Weights favour the actions that actually bring followers and sales:
 * guardados (4) > compartidos (4) > clics (3) > comentarios (3) > likes (1).
 * Dividing by reach normalizes posts of very different sizes, so a small
 * post with a great response can beat a huge post nobody reacted to.
 */

export interface PostMetricsLike {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  impressions: number;
  reach: number;
  clicks: number;
}

/** Argentina time (ART, UTC-3) offset in hours. */
export const AR_OFFSET_HOURS = -3;

const WEIGHTS = {
  saves: 4,
  shares: 4,
  clicks: 3,
  comments: 3,
  likes: 1,
} as const;

export interface PostScore {
  /** Weighted interactions per 1000 reached accounts. */
  index: number;
  /** Raw weighted interactions. */
  weighted: number;
  /** Interactions / reach, as a percentage. */
  engagementRate: number;
}

/**
 * Computes the index of a post. Posts with no reach at all score 0 (they
 * cannot be compared — better to publish more than to inflate numbers).
 */
export function scorePost(metrics: PostMetricsLike): PostScore {
  const weighted =
    metrics.likes * WEIGHTS.likes +
    metrics.comments * WEIGHTS.comments +
    metrics.shares * WEIGHTS.shares +
    metrics.saves * WEIGHTS.saves +
    metrics.clicks * WEIGHTS.clicks;

  const reach = Math.max(metrics.reach, metrics.impressions, 0);
  if (reach <= 0) {
    return { index: 0, weighted, engagementRate: 0 };
  }

  const engagementRate = (weighted / reach) * 100;
  const index = Math.round((weighted / reach) * 1000);
  return { index, weighted, engagementRate: Math.round(engagementRate * 10) / 10 };
}

/** Hour of the day (ART) a post was published — used for "best hour" stats. */
export function publishedHourAr(date: Date): number {
  const utcHours = date.getUTCHours();
  return (utcHours + AR_OFFSET_HOURS + 24) % 24;
}

/** Formats an ART hour as "HH:MM". */
export function formatHourAr(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export interface HourBucket {
  hour: number;
  label: string;
  posts: number;
  avgReach: number;
  avgIndex: number;
}

/**
 * Groups published posts by publication hour (ART) and averages reach and
 * index per bucket — the empirical answer to "a qué hora conviene publicar".
 */
export function buildHourBuckets(
  rows: { publishedAt: Date; reach: number; index: number }[]
): HourBucket[] {
  const buckets = new Map<number, { reach: number; index: number; count: number }>();

  for (const row of rows) {
    const hour = publishedHourAr(row.publishedAt);
    const current = buckets.get(hour) ?? { reach: 0, index: 0, count: 0 };
    current.reach += row.reach;
    current.index += row.index;
    current.count += 1;
    buckets.set(hour, current);
  }

  return [...buckets.entries()]
    .map(([hour, value]) => ({
      hour,
      label: formatHourAr(hour),
      posts: value.count,
      avgReach: Math.round(value.reach / value.count),
      avgIndex: Math.round(value.index / value.count),
    }))
    .sort((a, b) => b.avgIndex - a.avgIndex || b.avgReach - a.avgReach);
}

/**
 * Picks the best publication hours from the observed data. Falls back to the
 * provided defaults when there is not enough data yet.
 */
export function suggestBestHours(
  buckets: HourBucket[],
  fallback: string[] = ["11:00", "19:30"],
  minPosts = 2
): string[] {
  const usable = buckets.filter((bucket) => bucket.posts >= minPosts);
  if (usable.length === 0) return fallback;

  return usable
    .slice(0, 3)
    .map((bucket) => bucket.label)
    .sort();
}
