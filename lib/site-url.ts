/**
 * Single source of truth for the public site origin.
 * Everything that renders absolute URLs (metadata, canonical, OG, robots,
 * sitemap, OG image route) must go through here instead of reading
 * NEXTAUTH_URL directly with its own fallback.
 */
export function getSiteUrl(requestOrigin?: string): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    (requestOrigin ? undefined : process.env.NODE_ENV === "production" ? "https://nyady.com" : undefined);

  const url = (fromEnv ?? requestOrigin ?? "http://localhost:3000").replace(/\/$/, "");

  // If an http fallback slipped through in production (e.g. a local tunnel),
  // canonify to the production domain so canonical/OG never leak staging URLs.
  if (process.env.NODE_ENV === "production" && url.startsWith("http://")) {
    return "https://nyady.com";
  }
  return url;
}

/** Alias kept so existing call-sites keep working. */
export const getAppUrl = getSiteUrl;

export const SITE_NAME = "NYADY";
export const SITE_TAGLINE = "Sandalias artesanales hechas a mano";
