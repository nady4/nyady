import prisma from "@/lib/prisma";
import { formatAdminDate, formatARS } from "@/lib/admin/format";
import { buildReferralLink } from "@/lib/marketing/funnel";

/**
 * Referral program (phase 5).
 *
 * A referral IS a coupon (the money math never changes): a normal Coupon row
 * flagged `isReferral` with an owner. The customer shares a link with the
 * code in `ref`; the buyer lands with the code in a cookie, the cart applies
 * it automatically and the order records it — so the admin can see exactly
 * how much each referrer brought in.
 */

export interface ReferralCandidate {
  userId: string;
  username: string;
  email: string;
  ordersCount: number;
  totalSpent: number;
}

export interface ReferralCodeRow {
  code: string;
  ownerName: string | null;
  ownerUserId: string | null;
  discountPercent: number | null;
  active: boolean;
  usedCount: number;
  usageLimit: number | null;
  sourceCampaign: string | null;
  createdAtText: string;
  orders: number;
  revenue: number;
  link: string;
}

/** Customers worth giving a referral code to: they already bought and spent. */
export async function loadReferralCandidates(
  limit = 20
): Promise<ReferralCandidate[]> {
  const grouped = await prisma.order.groupBy({
    by: ["userId"],
    where: { status: "approved", archivedAt: null },
    _count: { _all: true },
    _sum: { total: true },
  });

  if (grouped.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((row) => row.userId) }, archivedAt: null },
    select: { id: true, username: true, email: true },
  });
  const userById = new Map(users.map((user) => [user.id, user]));

  return grouped
    .map((row) => {
      const user = userById.get(row.userId);
      if (!user) return null;
      return {
        userId: user.id,
        username: user.username,
        email: user.email,
        ordersCount: row._count._all,
        totalSpent: Math.round(row._sum.total?.toNumber() ?? 0),
      };
    })
    .filter((row): row is ReferralCandidate => row !== null)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);
}

/** Builds a readable code: first name + short random suffix. */
export function makeReferralCode(username: string): string {
  const base = username
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base || "NYADY"}${suffix}`;
}

export async function loadReferralCodes(): Promise<ReferralCodeRow[]> {
  const coupons = await prisma.coupon.findMany({
    where: { isReferral: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (coupons.length === 0) return [];

  const codes = coupons.map((coupon) => coupon.code);
  const orders = await prisma.order.findMany({
    where: {
      status: "approved",
      archivedAt: null,
      OR: [{ referralCode: { in: codes } }, { couponCode: { in: codes } }],
    },
    select: { referralCode: true, couponCode: true, total: true },
  });

  const revenueByCode = new Map<string, { orders: number; revenue: number }>();
  for (const order of orders) {
    const code = order.referralCode || order.couponCode;
    if (!code) continue;
    const bucket = revenueByCode.get(code) ?? { orders: 0, revenue: 0 };
    bucket.orders += 1;
    bucket.revenue += order.total.toNumber();
    revenueByCode.set(code, bucket);
  }

  return coupons.map((coupon) => {
    const bucket = revenueByCode.get(coupon.code) ?? { orders: 0, revenue: 0 };
    return {
      code: coupon.code,
      ownerName: coupon.referrerName,
      ownerUserId: coupon.referrerUserId,
      discountPercent:
        coupon.type === "PERCENT" ? Math.round(coupon.value.toNumber()) : null,
      active: coupon.active,
      usedCount: coupon.usedCount,
      usageLimit: coupon.usageLimit,
      sourceCampaign: coupon.sourceCampaign,
      createdAtText: formatAdminDate(coupon.createdAt),
      orders: bucket.orders,
      revenue: Math.round(bucket.revenue),
      link: buildReferralLink(coupon.code, coupon.sourceCampaign),
    };
  });
}

/** Money formatter re-export for the admin cards. */
export { formatARS };
