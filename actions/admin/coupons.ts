"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ensureAdmin } from "@/lib/admin";
import {
  validateCouponInput,
} from "@/lib/admin/coupon-validation";
import type {
  AdminActionResult,
  AdminCouponInput,
} from "@/types/admin";

function revalidateCoupons() {
  revalidatePath("/admin");
  revalidatePath("/admin/cupones");
}

export async function createCouponAction(
  input: AdminCouponInput
): Promise<AdminActionResult & { couponId?: string }> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const check = await validateCouponInput(input, null);
  if (!check.ok || !check.parsed) {
    return { ok: false, error: check.error };
  }

  try {
    const coupon = await prisma.coupon.create({ data: check.parsed });
    revalidateCoupons();
    return { ok: true, couponId: coupon.id };
  } catch (error) {
    console.error("[admin/coupons] create failed:", error);
    return { ok: false, error: "No se pudo crear el cupón" };
  }
}

export async function updateCouponAction(
  couponId: string,
  input: AdminCouponInput
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const existing = await prisma.coupon.findUnique({
    where: { id: couponId },
    select: { id: true, usedCount: true },
  });
  if (!existing) return { ok: false, error: "Cupón no encontrado" };

  const check = await validateCouponInput(input, couponId);
  if (!check.ok || !check.parsed) {
    return { ok: false, error: check.error };
  }

  // Guard rails on edit: limits must still cover current usage, and only a
  // future expiry is accepted (pausing is the way to retire a coupon).
  if (
    check.parsed.usageLimit !== null &&
    check.parsed.usageLimit < existing.usedCount
  ) {
    return {
      ok: false,
      error: `El límite no puede ser menor a los usos actuales (${existing.usedCount})`,
    };
  }
  if (
    check.parsed.expiresAt &&
    check.parsed.expiresAt.getTime() < Date.now()
  ) {
    return { ok: false, error: "La fecha de vencimiento debe ser futura" };
  }

  try {
    await prisma.coupon.update({
      where: { id: couponId },
      data: check.parsed,
    });
  } catch (error) {
    console.error("[admin/coupons] update failed:", error);
    return { ok: false, error: "No se pudo actualizar el cupón" };
  }

  revalidateCoupons();
  return { ok: true };
}

export async function toggleCouponActiveAction(
  couponId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    select: { active: true },
  });
  if (!coupon) return { ok: false, error: "Cupón no encontrado" };

  try {
    await prisma.coupon.update({
      where: { id: couponId },
      data: { active: !coupon.active },
    });
  } catch (error) {
    console.error("[admin/coupons] toggle failed:", error);
    return { ok: false, error: "No se pudo actualizar el cupón" };
  }

  revalidateCoupons();
  return { ok: true };
}

/**
 * Permanent delete — blocked for coupons with usage so the one-per-user /
 * usage-limit semantics recorded on past orders keep meaning. (Order.couponId
 * is set null by Prisma on delete; those orders keep their couponCode
 * snapshot for display, but the code would be reusable afterwards.)
 */
export async function deleteCouponAction(
  couponId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    select: { usedCount: true },
  });
  if (!coupon) return { ok: false, error: "Cupón no encontrado" };
  if (coupon.usedCount > 0) {
    return {
      ok: false,
      error: "El cupón tiene usos: pausalo en vez de eliminarlo",
    };
  }

  try {
    await prisma.coupon.delete({ where: { id: couponId } });
  } catch (error) {
    console.error("[admin/coupons] delete failed:", error);
    return { ok: false, error: "No se pudo eliminar el cupón" };
  }

  revalidateCoupons();
  return { ok: true };
}
