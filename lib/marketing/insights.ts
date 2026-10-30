import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/marketing/crypto";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/format";

/**
 * Phase 3: insights sync. Pulls lifetime metrics for published posts and
 * account followers from the Meta Graph API (day of sync → daily snapshot
 * rows in SocialPostMetric / SocialAccountStat). Designed to run from the
 * Vercel Cron (/api/crons/marketing-insights) or the admin "Sincronizar
 * ahora" action.
 */

const API_VERSION = process.env.META_API_VERSION ?? "v26.0";
const GRAPH = `https://graph.facebook.com/${API_VERSION}`;

// Only sync posts published within this window to keep API usage bounded.
const SYNC_WINDOW_DAYS = 60;
const MAX_POSTS_PER_SYNC = 25;

interface Accounts {
  facebook: { pageId: string; pageToken: string } | null;
  instagram: { igUserId: string; pageToken: string } | null;
}

async function loadAccounts(): Promise<Accounts> {
  const rows = await prisma.socialAccount.findMany();
  const accounts: Accounts = { facebook: null, instagram: null };
  for (const row of rows) {
    const token = decryptToken(row.tokenEnc);
    if (!token) continue;
    if (row.channel === "facebook" && row.pageId) {
      accounts.facebook = { pageId: row.pageId, pageToken: token };
    }
    if (row.channel === "instagram" && row.igUserId) {
      accounts.instagram = { igUserId: row.igUserId, pageToken: token };
    }
  }
  return accounts;
}

async function graphJson(
  path: string,
  params: URLSearchParams,
  timeoutMs = 20_000
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = new URL(`${GRAPH}/${path}`);
    for (const [k, v] of params) url.searchParams.set(k, v);
    const res = await fetch(url, { signal: controller.signal });
    const json = (await res.json()) as
      | Record<string, unknown>
      | { error?: { message?: string } };
    if (!res.ok || ("error" in json && json.error)) {
      const error = (json as { error?: { message?: string } }).error?.message;
      throw new Error(error ?? `HTTP ${res.status} en insights`);
    }
    return json as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Timeout de la API de Meta en insights");
    }
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    clearTimeout(timer);
  }
}

interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  impressions: number;
  reach: number;
  clicks: number;
}

const EMPTY_METRICS: PostMetrics = {
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  impressions: 0,
  reach: 0,
  clicks: 0,
};

function insightNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

interface InsightObject {
  name?: string;
  values?: { value?: unknown }[];
}

/** FB: lifetime post insights (impressions/unique/clicks) + reactions + shares. */
async function fetchFacebookMetrics(
  fbPostId: string,
  pageToken: string
): Promise<PostMetrics> {
  const metrics: PostMetrics = { ...EMPTY_METRICS };
  try {
    const insights = (await graphJson(`${fbPostId}/insights`, new URLSearchParams({
      metric: "post_impressions,post_impressions_unique,post_clicks",
      access_token: pageToken,
    }))) as { data?: InsightObject[] };
    for (const item of insights.data ?? []) {
      const value = insightNumber(item.values?.[0]?.value);
      if (item.name === "post_impressions") metrics.impressions = value;
      if (item.name === "post_impressions_unique") metrics.reach = value;
      if (item.name === "post_clicks") metrics.clicks = value;
    }
  } catch (error) {
    console.error("[insights] fb insights failed:", error);
  }
  try {
    const post = (await graphJson(fbPostId, new URLSearchParams({
      fields: "reactions.summary(total_count).summary(true),shares",
      access_token: pageToken,
    }))) as {
      reactions?: { summary?: { total_count?: number } };
      shares?: { count?: number };
    };
    metrics.likes = insightNumber(post.reactions?.summary?.total_count);
    metrics.shares = insightNumber(post.shares?.count);
  } catch (error) {
    console.error("[insights] fb post fields failed:", error);
  }
  return metrics;
}

/** IG: media fields (like/comments) + lifetime insights (impressions/reach/saved). */
async function fetchInstagramMetrics(
  igMediaId: string,
  pageToken: string
): Promise<PostMetrics> {
  const metrics: PostMetrics = { ...EMPTY_METRICS };
  try {
    const media = (await graphJson(igMediaId, new URLSearchParams({
      fields: "like_count,comments_count",
      access_token: pageToken,
    }))) as { like_count?: number; comments_count?: number };
    metrics.likes = insightNumber(media.like_count);
    metrics.comments = insightNumber(media.comments_count);
  } catch (error) {
    console.error("[insights] ig media fields failed:", error);
  }
  try {
    const insights = (await graphJson(`${igMediaId}/insights`, new URLSearchParams({
      metric: "impressions,reach,saved",
      access_token: pageToken,
    }))) as { data?: InsightObject[] };
    for (const item of insights.data ?? []) {
      const value = insightNumber(item.values?.[0]?.value);
      if (item.name === "impressions") metrics.impressions = value;
      if (item.name === "reach") metrics.reach = value;
      if (item.name === "saved") metrics.saves = value;
    }
  } catch (error) {
    console.error("[insights] ig insights failed:", error);
  }
  return metrics;
}

async function upsertPostMetric(
  postId: string,
  date: Date,
  metrics: PostMetrics
): Promise<void> {
  await prisma.socialPostMetric.upsert({
    where: { postId_date: { postId, date } },
    update: {
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      saves: metrics.saves,
      impressions: metrics.impressions,
      reach: metrics.reach,
      clicks: metrics.clicks,
    },
    create: { postId, date, ...metrics },
  });
}

export interface InsightsSyncOutcome {
  postsSynced: number;
  postsFailed: number;
  followers: { facebook: number | null; instagram: number | null };
  syncedAt: Date;
}

/** One sync pass: followers snapshot + per-post lifetime metrics of the last N days. */
export async function runInsightsSync(): Promise<InsightsSyncOutcome> {
  const accounts = await loadAccounts();
  const syncedAt = new Date();
  const today = new Date(syncedAt.getFullYear(), syncedAt.getMonth(), syncedAt.getDate());
  const outcome: InsightsSyncOutcome = {
    postsSynced: 0,
    postsFailed: 0,
    followers: { facebook: null, instagram: null },
    syncedAt,
  };

  // Account-level: follower counts (no extra permission needed for own asset).
  if (accounts.facebook) {
    try {
      const page = (await graphJson(accounts.facebook.pageId, new URLSearchParams({
        fields: "fan_count",
        access_token: accounts.facebook.pageToken,
      }))) as { fan_count?: number };
      const followers = insightNumber(page.fan_count);
      outcome.followers.facebook = followers;
      await prisma.socialAccountStat.upsert({
        where: { channel_date: { channel: "facebook", date: today } },
        update: { followers },
        create: { channel: "facebook", date: today, followers },
      });
    } catch (error) {
      console.error("[insights] fb followers failed:", error);
    }
  }
  if (accounts.instagram) {
    try {
      const ig = (await graphJson(accounts.instagram.igUserId, new URLSearchParams({
        fields: "followers_count",
        access_token: accounts.instagram.pageToken,
      }))) as { followers_count?: number };
      const followers = insightNumber(ig.followers_count);
      outcome.followers.instagram = followers;
      await prisma.socialAccountStat.upsert({
        where: { channel_date: { channel: "instagram", date: today } },
        update: { followers },
        create: { channel: "instagram", date: today, followers },
      });
    } catch (error) {
      console.error("[insights] ig followers failed:", error);
    }
  }

  // Per-post sync of recently published posts.
  const since = new Date(today);
  since.setDate(since.getDate() - SYNC_WINDOW_DAYS);
  const posts = await prisma.socialPost.findMany({
    where: {
      publishedAt: { gte: since, not: null },
      OR: [{ fbPostId: { not: null } }, { igMediaId: { not: null } }],
    },
    orderBy: { publishedAt: "desc" },
    take: MAX_POSTS_PER_SYNC,
    select: { id: true, fbPostId: true, igMediaId: true },
  });

  for (const post of posts) {
    let ok = false;
    let combined: PostMetrics = { ...EMPTY_METRICS };
    try {
      if (post.fbPostId && accounts.facebook) {
        const fb = await fetchFacebookMetrics(post.fbPostId, accounts.facebook.pageToken);
        // Channels are independent surfaces: totals merge as plain sums so a
        // post published to both networks reflects both audiences.
        combined = {
          likes: combined.likes + fb.likes,
          comments: combined.comments + fb.comments,
          shares: combined.shares + fb.shares,
          saves: combined.saves + fb.saves,
          impressions: combined.impressions + fb.impressions,
          reach: combined.reach + fb.reach,
          clicks: combined.clicks + fb.clicks,
        };
        ok = true;
      }
      if (post.igMediaId && accounts.instagram) {
        const ig = await fetchInstagramMetrics(post.igMediaId, accounts.instagram.pageToken);
        combined = {
          likes: combined.likes + ig.likes,
          comments: combined.comments + ig.comments,
          shares: combined.shares + ig.shares,
          saves: combined.saves + ig.saves,
          impressions: combined.impressions + ig.impressions,
          reach: combined.reach + ig.reach,
          clicks: combined.clicks + ig.clicks,
        };
        ok = true;
      }
      if (ok) {
        await upsertPostMetric(post.id, today, combined);
        outcome.postsSynced += 1;
      }
    } catch (error) {
      console.error("[insights] post sync failed:", post.id, error);
      outcome.postsFailed += 1;
    }
  }

  if (outcome.postsSynced > 0 || outcome.postsFailed === 0) {
    await prisma.marketingSettings.upsert({
      where: { id: "default" },
      update: { lastInsightsSyncAt: syncedAt },
      create: { id: "default", lastInsightsSyncAt: syncedAt },
    });
  }

  return outcome;
}

// --- Read-side (panel aggregates) ---------------------------------------------

export interface MarketingStatsData {
  /** Preformatted server-side (avoids client-side hydration mismatches). */
  lastSyncAtText: string | null;
  followers: {
    facebook: { followers: number; dateText: string } | null;
    instagram: { followers: number; dateText: string } | null;
  };
  posts: {
    id: string;
    title: string;
    campaign: string | null;
    publishedAtText: string;
    permalink: string | null;
    dateText: string;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    impressions: number;
    reach: number;
    clicks: number;
  }[];
  totals: { likes: number; comments: number; shares: number; saves: number; impressions: number; reach: number; clicks: number };
}

/** Latest snapshot per published post + latest follower counts, for the panel. */
export async function loadMarketingStats(): Promise<MarketingStatsData> {
  const settings = await prisma.marketingSettings.findUnique({
    where: { id: "default" },
    select: { lastInsightsSyncAt: true },
  });

  const followersRows = await prisma.socialAccountStat.findMany({
    orderBy: [{ channel: "asc" }, { date: "desc" }],
  });
  const followersLatest = new Map<string, (typeof followersRows)[number]>();
  for (const row of followersRows) {
    if (!followersLatest.has(row.channel)) followersLatest.set(row.channel, row);
  }

  const publishedPosts = await prisma.socialPost.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 40,
    select: {
      id: true,
      title: true,
      campaign: true,
      publishedAt: true,
      fbPermalink: true,
      igPermalink: true,
      metrics: { orderBy: { date: "desc" }, take: 1 },
    },
  });

  const posts = publishedPosts
    .filter((post) => post.metrics.length > 0)
    .map((post) => {
      const latest = post.metrics[0];
      return {
        id: post.id,
        title: post.title,
        campaign: post.campaign,
        publishedAtText: formatAdminDateTime(post.publishedAt as Date),
        permalink: post.igPermalink ?? post.fbPermalink ?? null,
        dateText: formatAdminDate(latest.date),
        likes: latest.likes,
        comments: latest.comments,
        shares: latest.shares,
        saves: latest.saves,
        impressions: latest.impressions,
        reach: latest.reach,
        clicks: latest.clicks,
      };
    });

  const totals = {
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
  };
  for (const post of posts) {
    totals.likes += post.likes;
    totals.comments += post.comments;
    totals.shares += post.shares;
    totals.saves += post.saves;
    totals.impressions += post.impressions;
    totals.reach += post.reach;
    totals.clicks += post.clicks;
  }

  const fbRow = followersLatest.get("facebook");
  const igRow = followersLatest.get("instagram");

  return {
    lastSyncAtText: settings?.lastInsightsSyncAt
      ? formatAdminDateTime(settings.lastInsightsSyncAt)
      : null,
    followers: {
      facebook: fbRow
        ? { followers: fbRow.followers, dateText: formatAdminDate(fbRow.date) }
        : null,
      instagram: igRow
        ? { followers: igRow.followers, dateText: formatAdminDate(igRow.date) }
        : null,
    },
    posts,
    totals,
  };
}
