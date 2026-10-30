/**
 * Pure, client-safe WhatsApp helpers (no Prisma). The admin card imports
 * these; server-only DB loading lives in lib/marketing/whatsapp.ts.
 */

export interface WaRecipient {
  phone: string; // normalized digits: 54 + 10 digits
  name: string | null;
  /** Preformatted dd/mm/yyyy (server-side; avoids hydration mismatches). */
  lastOrderAtText: string;
  ordersCount: number;
  totalSpent: number;
  alreadySent: boolean;
}

/**
 * AR-tolerant phone normalization → "549" + 10 digits (13 total, the E.164
 * WhatsApp id for an Argentine mobile), or null if unusable. Accepts local
 * forms with trunk 0 and the 15 mobile marker, plain 10-digit numbers, and
 * full international forms with or without the carrier 9.
 */
export function normalizeArPhone(raw: string): string | null {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("0054")) digits = `54${digits.slice(4)}`;
  if (digits.startsWith("54")) {
    const rest = digits.slice(2);
    // 549 + 10 = correct; 54 + 10 missing the 9 → insert it.
    if (rest.startsWith("9") && rest.length === 11) return digits;
    if (rest.length === 10) return `549${rest}`;
    return null;
  }

  // Local forms: 0 + [area]15 + number, 15 + number, or bare area+number.
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
    const withArea = /^(\d{2,4})15(\d{6,8})$/.exec(digits);
    if (withArea) {
      const rest = withArea[1] + withArea[2];
      if (rest.length === 10) return `549${rest}`;
    }
    if (/^\d{10}$/.test(digits)) return `549${digits}`;
    return null;
  }
  if (digits.startsWith("15") && digits.length === 10) return `549${digits.slice(2)}`;

  if (/^\d{10}$/.test(digits)) return `549${digits}`;
  return null;
}

export function waDeepLink(phone: string, text: string | null): string {
  const base = `https://wa.me/${phone}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
