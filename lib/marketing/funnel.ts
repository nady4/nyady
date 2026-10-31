import prisma from "@/lib/prisma";
import { formatAdminDate, formatARS } from "@/lib/admin/format";
import { buildHourBuckets, scorePost, suggestBestHours } from "@/lib/marketing/scoring";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Marketing funnel (phase 5): what actually converts.
 *
 * Every published social link carries UTM params (lib/marketing/utm.ts) and
 * the checkout stores them on the Order, so this module can answer the only
 * question that matters: "¿qué post/campaña trajo ventas?".
 *
 * Revenue counts only PAID orders (status "approved" — the Mercado Pago
 * webhook moves an order there once the money is in). Pending/rejected/
 * cancelled orders are excluded so the numbers match the storefront.
 */

export interface FunnelTotals {
  paidOrders: number;
  revenue: number;
  aov: number;
  attributedOrders: number;
  attributedRevenue: number;
  socialOrders: number;
  socialRevenue: number;
  directOrders: number;
  directRevenue: number;
}

export interface FunnelSourceRow {
  source: string;
  label: string;
  orders: number;
  revenue: number;
  aov: number;
}

export interface FunnelCampaignRow {
  campaign: string;
  orders: number;
  revenue: number;
  aov: number;
  clicks: number;
  postTitle: string | null;
  permalink: string | null;
  publishedText: string | null;
}

export interface FunnelReferralRow {
  code: string;
  owner: string | null;
  discountPercent: number | null;
  orders: number;
  revenue: number;
}

export interface FunnelOrderRow {
  id: string;
  createdAtText: string;
  totalText: string;
  source: string;
  campaign: string | null;
  referralCode: string | null;
  customer: string;
}

export interface FunnelData {
  totals: FunnelTotals;
  bySource: FunnelSourceRow[];
  byCampaign: FunnelCampaignRow[];
  byReferral: FunnelReferralRow[];
  recent: FunnelOrderRow[];
  bestHours: string[];
  hourBuckets: ReturnType<typeof buildHourBuckets>;
  generatedAtText: string;
}

const SOURCE_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  google: "Google",
  campaign: "Campaña (sin origen)",
  direct: "Directo (sin UTM)",
  referral: "Referido",
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

function isSocial(source: string): boolean {
  return source === "facebook" || source === "instagram";
}

function emptyTotals(): FunnelTotals {
  return {
    paidOrders: 0,
    revenue: 0,
    aov: 0,
    attributedOrders: 0,
    attributedRevenue: 0,
    socialOrders: 0,
    socialRevenue: 0,
    directOrders: 0,
    directRevenue: 0,
  };
}

function finishTotals(totals: FunnelTotals): FunnelTotals {
  return {
    ...totals,
    aov: totals.paidOrders > 0 ? Math.round(totals.revenue / totals.paidOrders) : 0,
  };
}

/**
 * Loads the funnel. Everything is best-effort: a failure in one aggregation
 * must not break the admin page.
 */
export async function loadFunnelData(): Promise<FunnelData> {
  const totals = emptyTotals();

  const orders = await prisma.order.findMany({
    where: { status: "approved", archivedAt: null },
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: {
      id: true,
      total: true,
      createdAt: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      referralCode: true,
      couponCode: true,
      user: { select: { username: true, email: true } },
    },
  });

  const sourceMap = new Map<string, { orders: number; revenue: number }>();
  const campaignMap = new Map<string, { orders: number; revenue: number }>();
  const referralMap = new Map<string, { orders: number; revenue: number }>();
  const recent: FunnelOrderRow[] = [];

  for (const order of orders) {
    const revenue = order.total.toNumber();
    const source = (order.utmSource ?? "").trim().toLowerCase();
    const campaign = (order.utmCampaign ?? "").trim();
    const referral = (order.referralCode ?? "").trim();

    totals.paidOrders += 1;
    totals.revenue += revenue;

    if (source || campaign || referral) {
      totals.attributedOrders += 1;
      totals.attributedRevenue += revenue;
    }

    if (source && isSocial(source)) {
      totals.socialOrders += 1;
      totals.socialRevenue += revenue;
    } else if (!source && !campaign && !referral) {
      // No origin at all: direct traffic (someone typed the URL or came from
      // a source we do not tag, e.g. a shared link without UTMs).
      totals.directOrders += 1;
      totals.directRevenue += revenue;
    }

    // By source (UTM source, or "directo" when there is no UTM at all).
    const sourceKey = source || (campaign ? "campaign" : "direct");
    const sourceBucket = sourceMap.get(sourceKey) ?? { orders: 0, revenue: 0 };
    sourceBucket.orders += 1;
    sourceBucket.revenue += revenue;
    sourceMap.set(sourceKey, sourceBucket);

    // By campaign (the SocialPost.campaign value used in the post links).
    if (campaign) {
      const campaignBucket = campaignMap.get(campaign) ?? { orders: 0, revenue: 0 };
      campaignBucket.orders += 1;
      campaignBucket.revenue += revenue;
      campaignMap.set(campaign, campaignBucket);
    }

    // By referral code.
    if (referral) {
      const referralBucket = referralMap.get(referral) ?? { orders: 0, revenue: 0 };
      referralBucket.orders += 1;
      referralBucket.revenue += revenue;
      referralMap.set(referral, referralBucket);
    }

    if (recent.length < 15) {
      recent.push({
        id: order.id,
        createdAtText: formatAdminDate(order.createdAt),
        totalText: formatARS(revenue),
        source: source ? sourceLabel(source) : campaign ? "Campaña" : "Directo",
        campaign: campaign || null,
        referralCode: referral || null,
        customer: order.user.username || order.user.email,
      });
    }
  }

  // Link campaigns back to the post that produced them (campaign name is the
  // join key: buildPostLink writes utm_campaign=<campaign ?? postId>).
  const campaignNames = [...campaignMap.keys()];
  const posts = campaignNames.length
    ? await prisma.socialPost.findMany({
        where: { OR: [{ campaign: { in: campaignNames } }, { id: { in: campaignNames } }] },
        select: {
          id: true,
          title: true,
          campaign: true,
          publishedAt: true,
          igPermalink: true,
          fbPermalink: true,
          metrics: { orderBy: { date: "desc" }, take: 1 },
        },
      })
    : [];

  const postByCampaign = new Map<string, (typeof posts)[number]>();
  for (const post of posts) {
    const key = post.campaign ?? post.id;
    if (!postByCampaign.has(key)) postByCampaign.set(key, post);
  }

  const byCampaign: FunnelCampaignRow[] = [...campaignMap.entries()]
    .map(([campaign, bucket]) => {
      const post = postByCampaign.get(campaign) ?? null;
      const clicks = post?.metrics[0]?.clicks ?? 0;
      return {
        campaign,
        orders: bucket.orders,
        revenue: Math.round(bucket.revenue),
        aov: bucket.orders > 0 ? Math.round(bucket.revenue / bucket.orders) : 0,
        clicks,
        postTitle: post?.title ?? null,
        permalink: post?.igPermalink ?? post?.fbPermalink ?? null,
        publishedText: post?.publishedAt ? formatAdminDate(post.publishedAt) : null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);

  // Referral coupons: owner + discount + how much they brought in.
  const referralCodes = referralMap.size
    ? await prisma.coupon.findMany({
        where: { code: { in: [...referralMap.keys()] } },
        select: {
          code: true,
          referrerName: true,
          type: true,
          value: true,
        },
      })
    : [];
  const couponByCode = new Map(referralCodes.map((coupon) => [coupon.code, coupon]));

  const byReferral: FunnelReferralRow[] = [...referralMap.entries()]
    .map(([code, bucket]) => {
      const coupon = couponByCode.get(code) ?? null;
      return {
        code,
        owner: coupon?.referrerName ?? null,
        discountPercent:
          coupon?.type === "PERCENT" ? Math.round(coupon.value.toNumber()) : null,
        orders: bucket.orders,
        revenue: Math.round(bucket.revenue),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const bySource: FunnelSourceRow[] = [...sourceMap.entries()]
    .map(([source, bucket]) => ({
      source,
      label: sourceLabel(source),
      orders: bucket.orders,
      revenue: Math.round(bucket.revenue),
      aov: bucket.orders > 0 ? Math.round(bucket.revenue / bucket.orders) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);

  // Best publication hours, measured on the posts that already went out.
  const publishedPosts = await prisma.socialPost.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 120,
    select: {
      publishedAt: true,
      metrics: { orderBy: { date: "desc" }, take: 1 },
    },
  });

  const hourRows = publishedPosts
    .filter((post) => post.metrics.length > 0 && post.publishedAt)
    .map((post) => {
      const metric = post.metrics[0];
      const score = scorePost(metric);
      return {
        publishedAt: post.publishedAt as Date,
        reach: metric.reach,
        index: score.index,
      };
    });

  const hourBuckets = buildHourBuckets(hourRows);
  const preference = await prisma.contentPreference
    .findUnique({ where: { id: "default" } })
    .catch(() => null);
  const bestHours = suggestBestHours(hourBuckets, preference?.bestHours ?? ["11:00", "19:30"]);

  return {
    totals: finishTotals(totals),
    bySource,
    byCampaign,
    byReferral,
    recent,
    bestHours,
    hourBuckets,
    generatedAtText: formatAdminDate(new Date()),
  };
}

/** Share link for a referral code: tracked UTM + the code in `ref`. */
export function buildReferralLink(
  code: string,
  campaign?: string | null
): string {
  const siteUrl = getSiteUrl();
  const url = new URL(siteUrl);
  url.searchParams.set("utm_source", "instagram");
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", campaign || "referidos");
  url.searchParams.set("ref", code);
  return url.toString();
}
