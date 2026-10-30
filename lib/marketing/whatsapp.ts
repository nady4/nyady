import prisma from "@/lib/prisma";
import {
  normalizeArPhone,
  type WaRecipient,
} from "@/lib/marketing/wa-shared";

/**
 * Server-only WhatsApp recipient loading (phase 4, no Cloud API). Recipients
 * come from order data (customers who actually bought and left a phone);
 * the pure helpers live in wa-shared.ts so the admin card can import them
 * without pulling Prisma into the client bundle.
 */

export { normalizeArPhone, waDeepLink } from "@/lib/marketing/wa-shared";

/**
 * Recipients = customers with orders (manual + web). Built from the latest
 * orders (newest first) so names come from each customer's most recent
 * shipment snapshot; deduped by normalized phone. Wa recipients are people
 * who bought from the store, not scraped contacts.
 */
export async function loadWaRecipients(
  campaignId: string | null
): Promise<WaRecipient[]> {
  const orders = await prisma.order.findMany({
    where: { recipientPhone: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 600,
    select: {
      recipientPhone: true,
      recipientName: true,
      total: true,
      createdAt: true,
    },
  });

  // First (newest) occurrence per normalized phone wins.
  const map = new Map<string, WaRecipient>();
  for (const order of orders) {
    if (!order.recipientPhone) continue;
    const phone = normalizeArPhone(order.recipientPhone);
    if (!phone || map.has(phone)) continue;
    map.set(phone, {
      phone,
      name: order.recipientName ?? null,
      lastOrderAt: order.createdAt,
      ordersCount: 1,
      totalSpent: order.total.toNumber(),
      alreadySent: false,
    });
  }
  if (map.size === 0) return [];

  // Fill ordersCount/totalSpent with a cheap aggregate over the found phones.
  const stats = await prisma.order.groupBy({
    by: ["recipientPhone"],
    where: { recipientPhone: { not: null } },
    _count: { _all: true },
    _sum: { total: true },
  });
  const statsByPhone = new Map<string, { count: number; sum: number }>();
  for (const row of stats) {
    if (!row.recipientPhone) continue;
    const phone = normalizeArPhone(row.recipientPhone);
    if (!phone) continue;
    statsByPhone.set(phone, {
      count: row._count._all,
      sum: row._sum.total?.toNumber() ?? 0,
    });
  }
  for (const [phone, recipient] of map) {
    const match = statsByPhone.get(phone);
    if (match) {
      recipient.ordersCount = match.count;
      recipient.totalSpent = match.sum;
    }
  }

  const sentSet = campaignId
    ? new Set(
        (
          await prisma.whatsAppCampaignSend.findMany({
            where: { campaignId },
            select: { phone: true },
          })
        ).map((row) => row.phone)
      )
    : new Set<string>();

  for (const recipient of map.values()) {
    recipient.alreadySent = sentSet.has(recipient.phone);
  }

  return [...map.values()].sort(
    (a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime()
  );
}
