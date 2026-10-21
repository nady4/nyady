import prisma from "@/lib/prisma";
import type { AdminCouponInput } from "@/types/admin";

const CODE_RE = /^[A-Z0-9_-]{3,24}$/;

export interface ParsedCoupon {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  active: boolean;
  onePerUser: boolean;
  usageLimit: number | null;
  expiresAt: Date | null;
}

export function normalizeCouponCode(code: string): string {
  return (code ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

/** Date-only expiry stored as end-of-day so the coupon is usable that day. */
export function parseExpiry(iso: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(`${iso}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Shared validation for create/edit coupon actions (imported from
 * actions/admin/coupons.ts — plain module, not a server action export).
 */
export async function validateCouponInput(
  input: AdminCouponInput,
  currentId: string | null
): Promise<{ ok: boolean; error?: string; parsed?: ParsedCoupon }> {
  const code = normalizeCouponCode(input.code);
  if (!CODE_RE.test(code)) {
    return {
      ok: false,
      error:
        "El código debe tener 3-24 caracteres sin espacios (letras, números, - o _)",
    };
  }

  const type = input.type === "PERCENT" ? "PERCENT" : "FIXED";
  const value = Number(input.value);

  if (type === "PERCENT") {
    if (!Number.isFinite(value) || value < 1 || value > 100) {
      return { ok: false, error: "El porcentaje debe estar entre 1 y 100" };
    }
  } else if (!Number.isFinite(value) || value < 1) {
    return { ok: false, error: "El valor fijo debe ser mayor a $0" };
  }

  let usageLimit: number | null = null;
  if (input.usageLimit !== null && input.usageLimit !== undefined) {
    usageLimit = Math.floor(Number(input.usageLimit));
    if (!Number.isFinite(usageLimit) || usageLimit < 1) {
      return { ok: false, error: "El límite de usos debe ser 1 o más" };
    }
  }

  const expiresAt = parseExpiry(input.expiresAt);

  const duplicate = await prisma.coupon.findFirst({
    where: { code, ...(currentId ? { id: { not: currentId } } : {}) },
    select: { id: true },
  });
  if (duplicate) {
    return { ok: false, error: "Ya existe un cupón con ese código" };
  }

  return {
    ok: true,
    parsed: {
      code,
      type,
      value: type === "PERCENT" ? Math.round(value) : value,
      active: input.active,
      onePerUser: input.onePerUser,
      usageLimit,
      expiresAt,
    },
  };
}
