"use server";

import prisma from "@/lib/prisma";

export interface ValidatedCoupon {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
}

export interface ValidateCouponResult {
  ok: boolean;
  coupon?: ValidatedCoupon;
  error?: string;
}

/**
 * Validate a coupon code for a given user without consuming it. Checks:
 * exists (case-insensitive), active, not expired, under usageLimit, and —
 * when onePerUser is set — not already used by this user in a past order.
 *
 * Returns a translated (es-AR) error string suitable to show in the UI.
 */
export async function validateCouponForUser(
  code: string,
  userId: string
): Promise<ValidateCouponResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return { ok: false, error: "Ingresá un código de cupón" };
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: normalized }
  });

  if (!coupon) {
    return { ok: false, error: "El cupón no existe" };
  }
  if (!coupon.active) {
    return { ok: false, error: "El cupón ya no está disponible" };
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "El cupón está vencido" };
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: "El cupón alcanzó su uso máximo" };
  }

  if (coupon.onePerUser) {
    const alreadyUsed = await prisma.order.findFirst({
      where: { userId, couponId: coupon.id },
      select: { id: true }
    });
    if (alreadyUsed) {
      return { ok: false, error: "Ya usaste este cupón" };
    }
  }

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type as "PERCENT" | "FIXED",
      value: coupon.value
    }
  };
}
