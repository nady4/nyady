import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/marketing/crypto";
import { publishFacebookPost, publishInstagramPost } from "@/lib/marketing/meta";
import type { SocialPost } from "@prisma/client";
import { getSiteUrl } from "@/lib/site-url";
import { buildPostLink } from "@/lib/marketing/utm";

/**
 * Phase-2 publishing core shared by the admin server action ("Publicar
 * ahora" / "Correr cola") and the Vercel cron route. Resolves the connected
 * Meta accounts, builds per-channel payloads from the post row, publishes,
 * and records the results back on the SocialPost row.
 */

interface ConnectedAccounts {
  facebook: { pageId: string; pageToken: string; pageName: string | null } | null;
  instagram: { igUserId: string; pageToken: string; igUsername: string | null } | null;
}

async function resolveMetaAccounts(): Promise<ConnectedAccounts> {
  const rows = await prisma.socialAccount.findMany();
  const accounts: ConnectedAccounts = { facebook: null, instagram: null };
  for (const row of rows) {
    // Tokens are AES-256-GCM encrypted; a blob that fails to decrypt (secret
    // rotated, tampering) simply means "not connected" until re-connecting.
    const token = decryptToken(row.tokenEnc);
    if (!token) continue;
    if (row.channel === "facebook" && row.pageId) {
      accounts.facebook = {
        pageId: row.pageId,
        pageToken: token,
        pageName: row.pageName,
      };
    }
    if (row.channel === "instagram" && row.igUserId) {
      accounts.instagram = {
        igUserId: row.igUserId,
        pageToken: token,
        igUsername: row.igUsername,
      };
    }
  }
  return accounts;
}

/** Connection snapshot for the composer/connection UI. */
export async function metaAccountStatus(): Promise<{
  facebook: boolean;
  instagram: boolean;
  pageName: string | null;
  igUsername: string | null;
}> {
  const accounts = await resolveMetaAccounts();
  return {
    facebook: accounts.facebook != null,
    instagram: accounts.instagram != null,
    pageName: accounts.facebook?.pageName ?? null,
    igUsername: accounts.instagram?.igUsername ?? null,
  };
}

function buildMessage(post: SocialPost): string {
  const parts: string[] = [post.body.trim()];
  if (post.hashtags.length > 0) {
    parts.push(post.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "));
  }
  return parts.filter(Boolean).join("\n\n");
}

/** Adds utm_source/medium/campaign to the product link (returns link untouched if null). */
function buildPostLinkSafe(
  post: SocialPost,
  link: string | null,
  channel: "facebook" | "instagram"
): string | null {
  if (!link) return null;
  return buildPostLink(link, post, channel);
}

export type ChannelResult =
  | { ok: true; id: string; url: string | null }
  | { ok: false; error: string };

export interface PublishResults {
  results: {
    facebook?: ChannelResult;
    instagram?: ChannelResult;
  };
}

const QUEUE_BATCH_SIZE = 5;

/** Publish a single post row to every Meta channel it requests. */
export async function publishPostEverywhere(
  post: SocialPost,
  siteUrl: string
): Promise<PublishResults> {
  const accounts = await resolveMetaAccounts();
  const results: PublishResults["results"] = {};

  // Optional product link; only set for posts linked to a catalog product.
  let link: string | null = null;
  if (post.productId) {
    const product = await prisma.product.findUnique({
      where: { id: post.productId },
      select: { slug: true },
    });
    if (product) link = `${siteUrl}/products/${product.slug}`;
  }

  const message = [buildMessage(post), buildPostLinkSafe(post, link, "facebook")]
    .filter(Boolean)
    .join("\n\n");
  const instagramCaption = buildMessage(post);

  // Per-channel skip: a channel that already has an external id (fbPostId /
  // igMediaId) is NOT re-published — this keeps "Publicar" idempotent when
  // only one channel succeeded before (e.g. FB ok + IG rate-limited) and
  // spares the IG 100-posts/24h window for what actually failed.
  const needsFacebook = post.channels.includes("facebook") && !post.fbPostId;
  const needsInstagram = post.channels.includes("instagram") && !post.igMediaId;

  if (post.channels.includes("facebook")) {
    if (!needsFacebook) {
      results.facebook = { ok: true, id: post.fbPostId ?? "", url: post.fbPermalink ?? null };
    } else if (!accounts.facebook) {
      results.facebook = { ok: false, error: "Facebook no está conectado" };
    } else {
      try {
        const fb = await publishFacebookPost({
          pageId: accounts.facebook.pageId,
          pageToken: accounts.facebook.pageToken,
          message,
          // Photo post when the cover exists (caption text); link/text post
          // otherwise (link preview + clickable).
          imageUrl: post.media[0] ?? null,
          link: buildPostLinkSafe(post, link, "facebook"),
        });
        results.facebook = { ok: true, id: fb.id, url: fb.permalink ?? null };
      } catch (error) {
        results.facebook = {
          ok: false,
          error: error instanceof Error ? error.message : "Error publicando en Facebook",
        };
      }
    }
  }

  if (post.channels.includes("instagram")) {
    if (!needsInstagram) {
      results.instagram = {
        ok: true,
        id: post.igMediaId ?? "",
        url: post.igPermalink ?? null,
      };
    } else if (!accounts.instagram) {
      results.instagram = { ok: false, error: "Instagram no está conectado" };
    } else {
      // IG reads its own caption: the link travels as plain text (no
      // hyperlink in IG captions). Media must be public https URLs.
      try {
        const ig = await publishInstagramPost({
          igUserId: accounts.instagram.igUserId,
          pageToken: accounts.instagram.pageToken,
          imageUrls: post.media.filter((url) => /^https:\/\//.test(url)),
          caption: instagramCaption,
        });
        results.instagram = { ok: true, id: ig.id, url: ig.permalink ?? null };
      } catch (error) {
        results.instagram = {
          ok: false,
          error: friendlyInstagramError(
            error instanceof Error ? error.message : "Error publicando en Instagram"
          ),
        };
      }
    }
  }

  return { results };
}

/** Maps raw Graph errors into admin-readable messages, highlighting rate limits. */
function friendlyInstagramError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("rate limit") ||
    lower.includes("too many") ||
    lower.includes("reduce the amount") ||
    lower.includes("#2207042") ||
    lower.includes("application request limit")
  ) {
    return "IG: límite de publicación alcanzado (~100 posts API/24h). Reintentá en unas horas o mañana — el post queda pendiente y “Publicar” reenvía solo el canal faltante.";
  }
  if (lower.includes("#9007") || lower.includes("media id was not found")) {
    return "IG: el contenedor expiró (24h) o la media ya no existe; reintentá la publicación.";
  }
  return message;
}

interface PersistedResults {
  publishedAt: Date | null;
  errors: string[];
}

/** Persist publish results on the post row (partial-failure safe). */
export async function persistPublishResults(
  postId: string,
  results: PublishResults["results"]
): Promise<PersistedResults> {
  const errors: string[] = [];
  for (const [channel, result] of Object.entries(results)) {
    if (!result.ok) errors.push(`${channel}: ${result.error}`);
  }

  const data: {
    publishedAt?: Date;
    lastError?: string | null;
    fbPostId?: string;
    fbPermalink?: string | null;
    igMediaId?: string;
    igPermalink?: string | null;
  } = { lastError: errors.length > 0 ? errors.join(" · ") : null };

  if (results.facebook?.ok) {
    data.fbPostId = results.facebook.id;
    data.fbPermalink = results.facebook.url;
  }
  if (results.instagram?.ok) {
    data.igMediaId = results.instagram.id;
    data.igPermalink = results.instagram.url;
  }
  const anyOk = results.facebook?.ok || results.instagram?.ok;
  if (anyOk) data.publishedAt = new Date();

  await prisma.socialPost.update({ where: { id: postId }, data });
  return { publishedAt: data.publishedAt ?? null, errors };
}

/** Publish one post row and persist the outcome. */
export async function publishAndPersist(
  post: SocialPost,
  siteUrl: string
): Promise<PublishResults["results"]> {
  const { results } = await publishPostEverywhere(post, siteUrl);
  await persistPublishResults(post.id, results);
  return results;
}

export interface QueueOutcome {
  attempted: number;
  publishedPosts: number;
  failures: string[];
}

/**
 * Publish queue: ready posts whose scheduledAt came due. Bounded per
 * invocation so one slow Meta call can't blow the route's time budget.
 * "Publicar ahora" paths publish immediately instead of going through here;
 * failures that leave lastError set still show in the post list.
 */
export async function runPublishQueue(limit = QUEUE_BATCH_SIZE): Promise<QueueOutcome> {
  const siteUrl = getSiteUrl();
  const due = await prisma.socialPost.findMany({
    where: {
      status: "ready",
      publishedAt: null,
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  const outcome: QueueOutcome = { attempted: 0, publishedPosts: 0, failures: [] };
  for (const post of due) {
    if (!post.channels.some((channel) => channel === "facebook" || channel === "instagram")) {
      continue;
    }
    outcome.attempted += 1;
    const results = await publishAndPersist(post, siteUrl);
    if (results.facebook?.ok || results.instagram?.ok) {
      outcome.publishedPosts += 1;
    }
    for (const result of Object.values(results)) {
      if (!result.ok) outcome.failures.push(result.error);
    }
  }
  return outcome;
}
