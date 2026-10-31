/**
 * Marketing attribution primitives (phase 5).
 *
 * Pure module — no Prisma, no Node APIs — so it can be imported by the
 * client-side capture component, the checkout API route and the admin
 * server-side loaders alike.
 *
 * How it works:
 * 1. A social link carries `utm_source=instagram&utm_medium=social&
 *    utm_campaign=<campaña>` (built by lib/marketing/utm.ts) and, for
 *    referral codes, `ref=<CODIGO>`.
 * 2. `components/AttributionCapture.tsx` reads those params on the landing
 *    page and stores them in a first-party cookie (30 days) so the origin
 *    survives the whole session (product → cart → checkout).
 * 3. The checkout API copies the cookie onto the Order, and the admin
 *    funnel aggregates revenue by source / campaign / referral code.
 *
 * Nothing here is required for the store to work: the cookie is a
 * convenience, and a missing attribution simply means "direct traffic".
 */

/** Cookie holding the UTM payload (JSON). */
export const ATTRIBUTION_COOKIE = "nyady_attr";
/** Cookie holding the referral code (plain text, uppercased). */
export const REFERRAL_COOKIE = "nyady_ref";
/** Attribution window (days). Social traffic converts within days, not months. */
export const ATTRIBUTION_DAYS = 30;

export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  ref?: string;
}

const MAX_FIELD = 80;

function clean(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().slice(0, MAX_FIELD);
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Normalizes a referral code: uppercased, alphanumeric + underscore only. */
export function normalizeReferralCode(value: string | null | undefined): string | undefined {
  const cleaned = clean(value)?.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  return cleaned && cleaned.length >= 3 && cleaned.length <= 24 ? cleaned : undefined;
}

/**
 * Reads the attribution params out of a query string.
 * Returns null when the URL carries nothing worth storing.
 */
export function parseAttributionFromSearch(
  search: string | URLSearchParams
): Attribution | null {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;

  const attribution: Attribution = {
    utmSource: clean(params.get("utm_source")),
    utmMedium: clean(params.get("utm_medium")),
    utmCampaign: clean(params.get("utm_campaign")),
    utmContent: clean(params.get("utm_content")),
    ref: normalizeReferralCode(params.get("ref")),
  };

  const hasAny = Object.values(attribution).some((value) => value != null);
  return hasAny ? attribution : null;
}

/** Serializes the attribution payload for the cookie (compact JSON). */
export function serializeAttribution(attribution: Attribution): string {
  const compact: Record<string, string> = {};
  if (attribution.utmSource) compact.utmSource = attribution.utmSource;
  if (attribution.utmMedium) compact.utmMedium = attribution.utmMedium;
  if (attribution.utmCampaign) compact.utmCampaign = attribution.utmCampaign;
  if (attribution.utmContent) compact.utmContent = attribution.utmContent;
  if (attribution.ref) compact.ref = attribution.ref;
  return JSON.stringify(compact);
}

/** Parses the cookie payload; never throws (a corrupt cookie = no data). */
export function parseAttributionCookie(raw: string | null | undefined): Attribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const attribution: Attribution = {
      utmSource: clean(typeof parsed.utmSource === "string" ? parsed.utmSource : null),
      utmMedium: clean(typeof parsed.utmMedium === "string" ? parsed.utmMedium : null),
      utmCampaign: clean(typeof parsed.utmCampaign === "string" ? parsed.utmCampaign : null),
      utmContent: clean(typeof parsed.utmContent === "string" ? parsed.utmContent : null),
      ref: normalizeReferralCode(typeof parsed.ref === "string" ? parsed.ref : null),
    };
    const hasAny = Object.values(attribution).some((value) => value != null);
    return hasAny ? attribution : null;
  } catch {
    return null;
  }
}

/**
 * Builds a tracked link: keeps the original URL and adds the UTM params
 * (overwriting stale ones) plus an optional referral code.
 */
export function buildTrackedLink(
  baseUrl: string,
  params: {
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmContent?: string | null;
    ref?: string | null;
  }
): string {
  try {
    const url = new URL(baseUrl);
    if (params.utmSource) url.searchParams.set("utm_source", params.utmSource);
    if (params.utmMedium) url.searchParams.set("utm_medium", params.utmMedium);
    if (params.utmCampaign) url.searchParams.set("utm_campaign", params.utmCampaign);
    if (params.utmContent) url.searchParams.set("utm_content", params.utmContent);
    const ref = normalizeReferralCode(params.ref);
    if (ref) url.searchParams.set("ref", ref);
    return url.toString();
  } catch {
    return baseUrl;
  }
}
