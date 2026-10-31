/**
 * Contact channels (phase 5).
 *
 * Single source of truth for the store's WhatsApp number and the default
 * Instagram handle. The admin can override them from Marketing
 * ("Voz & preferencias"); these constants are the fallback so the footer and
 * the link-in-bio never show a missing button.
 */

/** Store WhatsApp in international format (no +, no spaces). */
export const DEFAULT_WHATSAPP_NUMBER = "5491178120252";

/** Instagram handle without the @ (override it in Marketing if it changes). */
export const DEFAULT_INSTAGRAM_HANDLE = "nyady.arg";

/** Facebook page vanity name (same source as the footer). */
export const DEFAULT_FACEBOOK_PAGE = "ny4dy";

/** wa.me deep link with a pre-filled message. */
export function whatsappLink(
  phone: string | null | undefined,
  message = "¡Hola! Vi tu perfil y quiero saber más de las sandalias NYADY 👠"
): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  const target = digits || DEFAULT_WHATSAPP_NUMBER;
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}
