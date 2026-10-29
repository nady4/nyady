import type { Prisma } from "@prisma/client";
import { num } from "@/lib/money";

/** Placeholder margin while real purchase costs are not tracked yet. */
export const DEFAULT_COST_MARGIN = 10000;

/**
 * Effective purchase cost of a product. Rows created before the cost column
 * existed (or imported without one) have no stored cost and fall back to the
 * initial placeholder: retail price minus DEFAULT_COST_MARGIN, floored at 0.
 */
export function purchasePriceOf(product: {
  price: Prisma.Decimal | number;
  purchasePrice: Prisma.Decimal | number | null;
}): number {
  if (product.purchasePrice !== null && product.purchasePrice !== undefined) {
    return num(product.purchasePrice);
  }
  return Math.max(num(product.price) - DEFAULT_COST_MARGIN, 0);
}
