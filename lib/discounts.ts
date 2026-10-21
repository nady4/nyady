// Pure discount math shared between the cart UI (client) and the orders API
// (server). No "use server" directive and no Prisma imports here, so it can be
// imported from both sides — this keeps the wholesale + coupon calculation in
// one place so the charged total always matches what the cart shows.

export type CouponType = "PERCENT" | "FIXED";

export interface CouponLike {
  code: string;
  type: CouponType;
  value: number;
}

export interface WholesaleTier {
  units: number;
  percent: number;
  label: string;
}

/**
 * Default volume discount tiers, ordered ascending. Used as the fallback
 * when StoreSettings has no (or invalid) saved tiers — the admin dashboard
 * can edit units, label and percent per tier.
 */
export const DEFAULT_WHOLESALE_TIERS: WholesaleTier[] = [
  { units: 4, percent: 10, label: "REVENDEDORA" },
  { units: 20, percent: 20, label: "MAYORISTA" }
];

/** Kept for backwards compatibility; prefer DEFAULT_WHOLESALE_TIERS. */
export const WHOLESALE_TIERS = DEFAULT_WHOLESALE_TIERS;

/**
 * Wholesale (volume) discount tier based on total item quantity in the cart.
 * Mirrors the tiers shown on the cart page: ≥20 units → 20%, ≥4 → 10%.
 */
export function getWholesaleDiscountPercent(
  totalQuantity: number,
  tiers: WholesaleTier[] = DEFAULT_WHOLESALE_TIERS
): number {
  let percent = 0;
  for (const tier of tiers) {
    if (totalQuantity >= tier.units) {
      percent = tier.percent;
    }
  }
  return percent;
}

/**
 * Next volume tier above the current quantity. Returns the tier plus how many
 * more units are needed, or null when the top tier is already reached.
 */
export function getNextWholesaleTier(
  totalQuantity: number,
  tiers: WholesaleTier[] = DEFAULT_WHOLESALE_TIERS
): (WholesaleTier & { unitsNeeded: number }) | null {
  for (const tier of tiers) {
    if (totalQuantity < tier.units) {
      return { ...tier, unitsNeeded: tier.units - totalQuantity };
    }
  }
  return null;
}

export interface DiscountBreakdown {
  /** Full-price sum of products (before any discount). */
  productsTotal: number;
  /** Wholesale discount percent applied (0, 10, or 20). */
  wholesalePercent: number;
  /** Wholesale discount amount in ARS. */
  wholesaleAmount: number;
  /** Subtotal after the wholesale discount, before the coupon. */
  subtotalAfterWholesale: number;
  /** Coupon discount amount in ARS (0 if no coupon). */
  couponAmount: number;
  /** Subtotal after wholesale + coupon. Shipping is added on top of this. */
  discountedSubtotal: number;
  /** wholesaleAmount + couponAmount. */
  totalDiscount: number;
  /**
   * Combined discount as a fraction of productsTotal (0–1). Used to derive
   * per-item discounted unit prices for the Mercado Pago preference so its
   * total matches exactly without negative line items.
   */
  effectiveDiscountRate: number;
}

export interface ComputeDiscountsInput {
  /** Full-price products total (sum of price * quantity). */
  productsTotal: number;
  /** Total quantity of items in the cart. */
  totalQuantity: number;
  /** The coupon to apply, or null. Assumed already validated. */
  coupon: CouponLike | null;
  /** Volume discount tiers (defaults to DEFAULT_WHOLESALE_TIERS). */
  tiers?: WholesaleTier[];
}

/**
 * Compute the full discount breakdown. The coupon stacks on top of the
 * wholesale-discounted subtotal. A FIXED coupon is clamped so it can't make
 * the subtotal negative; a PERCENT coupon is clamped to 0–100.
 */
export function computeDiscounts({
  productsTotal,
  totalQuantity,
  coupon,
  tiers
}: ComputeDiscountsInput): DiscountBreakdown {
  const wholesalePercent = getWholesaleDiscountPercent(totalQuantity, tiers);
  const wholesaleAmount = productsTotal * (wholesalePercent / 100);
  const subtotalAfterWholesale = productsTotal - wholesaleAmount;

  let couponAmount = 0;
  if (coupon) {
    if (coupon.type === "PERCENT") {
      const percent = Math.min(Math.max(coupon.value, 0), 100);
      couponAmount = subtotalAfterWholesale * (percent / 100);
    } else if (coupon.type === "FIXED") {
      couponAmount = Math.min(Math.max(coupon.value, 0), subtotalAfterWholesale);
    }
  }

  const discountedSubtotal = subtotalAfterWholesale - couponAmount;
  const totalDiscount = wholesaleAmount + couponAmount;
  const effectiveDiscountRate =
    productsTotal > 0 ? totalDiscount / productsTotal : 0;

  return {
    productsTotal,
    wholesalePercent,
    wholesaleAmount,
    subtotalAfterWholesale,
    couponAmount,
    discountedSubtotal,
    totalDiscount,
    effectiveDiscountRate
  };
}

/**
 * Round to 2 decimals (cents). Used for per-item MP unit prices so the
 * preference sum matches the order total after rounding.
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
