import type { ShippingQuoteResult } from "@/types";

// Carriers whose options are offered at checkout (see ShippingQuote). The
// product page estimate restricts itself to the same list so the window it
// shows matches what the customer will find in the cart.
export const ALLOWED_CARRIERS = [233, 208, 323];

// Carriers never offered to customers, matched case-insensitively against
// carrier and service names (Cabify Logistics has no fixed carrier id).
export const EXCLUDED_CARRIER_NAMES = ["cabify"];

/**
 * Standard package of one pair (its box). The cart quotes every unit with
 * these values and Zipnova's `type_packaging: "dynamic"` decides how the
 * units get packed, so this is the representative starting package, not a
 * promise of the final parcel.
 */
export const PACKAGE_ONE_PAIR = {
  weight: 500,
  height: 30,
  width: 24,
  length: 14,
} as const;

export function isExcludedCarrier(quote: ShippingQuoteResult): boolean {
  const names = [quote.carrier?.name, quote.service_type?.name].map((name) =>
    (name || "").toLowerCase()
  );
  return EXCLUDED_CARRIER_NAMES.some((excluded) =>
    names.some((name) => name.includes(excluded))
  );
}

/**
 * Delivery window for a quote: the carrier's estimated delivery date plus the
 * 3-7 business days of elaboration. Single source of truth for the window
 * shown on the cart and on the product page.
 */
export function getDeliveryWindow(estimatedDelivery: string): {
  min: string;
  max: string;
} {
  const deliveryDate = new Date(estimatedDelivery);
  deliveryDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + diffDays + 3);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + diffDays + 7);

  const formatDate = (d: Date) => {
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    return `${day}/${month}`;
  };

  return { min: formatDate(minDate), max: formatDate(maxDate) };
}

/**
 * Quotes that can be shown to the customer, preferring the carriers offered
 * at checkout. Falls back to every valid quote when the preferred carriers
 * don't cover the address.
 */
export function getEstimateQuotes(
  quotes: ShippingQuoteResult[]
): ShippingQuoteResult[] {
  const validQuotes = quotes.filter(
    (q) =>
      q.selectable !== false &&
      !isExcludedCarrier(q) &&
      Boolean(q.delivery_time?.estimated_delivery) &&
      !Number.isNaN(new Date(q.delivery_time.estimated_delivery).getTime())
  );

  const preferredQuotes = validQuotes.filter(
    (q) =>
      ALLOWED_CARRIERS.includes(q.carrier.id) &&
      (q.logistic_type === "carrier_dropoff" ||
        q.logistic_type === "xd_dropoff")
  );

  return preferredQuotes.length > 0 ? preferredQuotes : validQuotes;
}

/** Quote with the earliest estimated delivery date. */
export function getFastestQuote(
  quotes: ShippingQuoteResult[]
): ShippingQuoteResult | null {
  return quotes.reduce<ShippingQuoteResult | null>(
    (best, q) =>
      !best ||
      new Date(q.delivery_time.estimated_delivery) <
        new Date(best.delivery_time.estimated_delivery)
        ? q
        : best,
    null
  );
}
