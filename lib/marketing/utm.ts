/**
 * UTM-aware product link builder for social posts (phase 3 funnel). Every
 * published link gets stable attribution so the admin funnel (visits/orders
 * from social) can be measured without extra tooling.
 */

import type { SocialPost } from "@prisma/client";

export function buildPostLink(
  baseLink: string,
  post: Pick<SocialPost, "id" | "campaign">,
  channel: "facebook" | "instagram"
): string {
  try {
    const url = new URL(baseLink);
    url.searchParams.set("utm_source", channel);
    url.searchParams.set("utm_medium", "social");
    url.searchParams.set("utm_campaign", post.campaign ?? post.id);
    return url.toString();
  } catch {
    // Relative or malformed link: return untouched.
    return baseLink;
  }
}
