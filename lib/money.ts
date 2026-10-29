import { Prisma } from "@prisma/client";

/**
 * Money columns are stored as Prisma Decimal (numeric(14,2)). The rest of the
 * app does currency math in plain `number`, so every place that *reads* money
 * (price, total, unitPrice, discountAmount, coupon.value) funnels through
 * `num()`. Writing still happens via Decimal-safe numeric literals, so JS
 * floats are reconciled by the DB scale.
 */
export function num(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return value.toNumber();
}

/** Sum-safe multiplication used across cart/quote/email code paths. */
export function moneyRound(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Canonical ARS display format: "$27.500,00" style, es-AR, no decimals. */
export function formatARS(value: number): string {
  return `$${Math.round(value).toLocaleString("es-AR")}`;
}
