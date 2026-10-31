"use client";

import { useEffect } from "react";
import {
  ATTRIBUTION_COOKIE,
  REFERRAL_COOKIE,
  ATTRIBUTION_DAYS,
  parseAttributionFromSearch,
  serializeAttribution,
} from "@/lib/marketing/attribution";

/**
 * Captures the marketing attribution of the visit.
 *
 * A visitor coming from an Instagram/Facebook post lands on a URL with
 * `utm_source`, `utm_medium`, `utm_campaign` (and `ref` for referral
 * links). This component stores them in first-party cookies so the origin
 * survives the whole session — the checkout then attributes the order to the
 * post that brought it.
 *
 * It renders nothing and never blocks the page.
 */
export default function AttributionCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const attribution = parseAttributionFromSearch(params);
      if (!attribution) return;

      const expires = new Date(Date.now() + ATTRIBUTION_DAYS * 24 * 60 * 60_000);

      if (attribution.utmSource || attribution.utmMedium || attribution.utmCampaign) {
        // Merge with the previous visit: a later click on another post wins
        // for the fields it carries, but the ones it does not carry survive.
        const previous = readJsonCookie(ATTRIBUTION_COOKIE);
        const merged = {
          utmSource: attribution.utmSource ?? previous.utmSource,
          utmMedium: attribution.utmMedium ?? previous.utmMedium,
          utmCampaign: attribution.utmCampaign ?? previous.utmCampaign,
          utmContent: attribution.utmContent ?? previous.utmContent,
          ref: attribution.ref ?? previous.ref,
        };
        document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(
          serializeAttribution(merged)
        )}; path=/; expires=${expires.toUTCString()}; samesite=lax`;
      }

      if (attribution.ref) {
        document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(
          attribution.ref
        )}; path=/; expires=${expires.toUTCString()}; samesite=lax`;
      }
    } catch {
      // Attribution is a nice-to-have: never break the page for it.
    }
  }, []);

  return null;
}

function readJsonCookie(name: string): Record<string, string | undefined> {
  try {
    const match = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${name}=`));
    if (!match) return {};
    const parsed = JSON.parse(decodeURIComponent(match.slice(name.length + 1)));
    return parsed as Record<string, string | undefined>;
  } catch {
    return {};
  }
}
