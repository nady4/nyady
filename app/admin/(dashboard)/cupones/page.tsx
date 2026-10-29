import prisma from "@/lib/prisma";
import CouponsAdmin from "@/components/admin/coupons/CouponsAdmin";
import { nowMs } from "@/lib/admin/format";
import { num } from "@/lib/money";
import type { AdminCouponRow } from "@/types/admin";

export const metadata = {
  title: "Cupones",
};

export default async function AdminCouponsPage() {
  const coupons = await prisma.coupon.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const rows: AdminCouponRow[] = coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    type: coupon.type as "PERCENT" | "FIXED",
    value: num(coupon.value),
    active: coupon.active,
    expiresAt: coupon.expiresAt,
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    onePerUser: coupon.onePerUser,
    createdAt: coupon.createdAt,
  }));

  return (
    <main className="admin-page admin-page-wide">
      <h1 className="admin-title">Cupones</h1>
      <CouponsAdmin coupons={rows} now={nowMs()} />
    </main>
  );
}
