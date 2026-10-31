import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/marketing/crypto";
import {
  publishFacebookPost,
  publishInstagramPost,
  publishInstagramReel,
} from "@/lib/marketing/meta";
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

  // Video posts (mediaType "video") carry the .mp4 in media[0] and an
  // optional cover in media[1]. Instagram publishes them as REELS; Facebook
  // gets the cover photo + the product link (posting a video to a Page needs
  // extra permissions we do not request yet).
  const isVideo = post.mediaType === "video";
  const videoUrl = isVideo ? post.media[0] ?? null : null;
  const videoCover = isVideo ? post.media[1] ?? null : null;
  const coverImage = isVideo ? videoCover : post.media[0] ?? null;

  // Per-channel skip: a channel that already has an external id (fbPostId /
  // igMediaId) is NOT re-published — this keeps "Publicar" idempotent when
  // only one channel succeeded before (e.g. FB ok + IG rate-limited) and
  // spares the IG 100-posts/24h window for what actually failed.
  const needsFacebook = post.channels.includes("facebook") && !post.fbPostId;
  const needsInstagram = post.channels.includes("instagram") && !post.igMediaId;

  if (post.channels.includes("facebook")) {
    if (!needsFacebook) {
      results.facebook = { ok: true, id: post.fbPostId ?? "", url: post.fbPermalink ?? null };
    } else if (Date.now() < channelThrottledUntil.facebook) {
      results.facebook = { ok: false, error: cooldownLabel("facebook") };
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
          imageUrl: coverImage,
          link: buildPostLinkSafe(post, link, "facebook"),
        });
        results.facebook = { ok: true, id: fb.id, url: fb.permalink ?? null };
      } catch (error) {
        results.facebook = {
          ok: false,
          error: friendlyChannelError(
            "facebook",
            error instanceof Error ? error.message : "Error publicando en Facebook"
          ),
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
    } else if (Date.now() < channelThrottledUntil.instagram) {
      // Circuit breaker open: don't spend Graph calls while the app is
      // throttled — the post stays pending and can be retried later.
      results.instagram = { ok: false, error: cooldownLabel("instagram") };
    } else if (!accounts.instagram) {
      results.instagram = { ok: false, error: "Instagram no está conectado" };
    } else {
      // IG reads its own caption: the link travels as plain text (no
      // hyperlink in IG captions). Media must be public https URLs.
      try {
        const ig = isVideo
          ? await publishInstagramReel({
              igUserId: accounts.instagram.igUserId,
              pageToken: accounts.instagram.pageToken,
              videoUrl: videoUrl ?? "",
              caption: instagramCaption,
              coverUrl: videoCover,
            })
          : await publishInstagramPost({
              igUserId: accounts.instagram.igUserId,
              pageToken: accounts.instagram.pageToken,
              imageUrls: post.media.filter((url) => /^https:\/\//.test(url)),
              caption: instagramCaption,
            });
        results.instagram = { ok: true, id: ig.id, url: ig.permalink ?? null };
      } catch (error) {
        results.instagram = {
          ok: false,
          error: friendlyChannelError(
            "instagram",
            error instanceof Error ? error.message : "Error publicando en Instagram"
          ),
        };
      }
    }
  }

  return { results };
}

/**
 * App-level Graph throttling (HTTP 403 "Application request limit reached")
 * rides on request VOLUME — one IG carousel costs ~10-17 calls, so a 23-post
 * bulk run trips it instantly and every blind retry keeps it tripped.
 * Solution: circuit breaker — when Meta says "limit hit", the channel gets a
 * 30-minute cooldown during which publish attempts short-circuit (no Graph
 * calls at all) and the posts stay pending; FB keeps publishing meanwhile.
 */
const CHANNEL_COOLDOWN_MS = 30 * 60_000;
const channelThrottledUntil: Record<"facebook" | "instagram", number> = {
  facebook: 0,
  instagram: 0,
};

function isAppRequestLimit(message: string): boolean {
  return (
    message.toLowerCase().includes("application request limit") ||
    message.toLowerCase().includes('"code":4') ||
    message.toLowerCase().includes("(#4)")
  );
}

function cooldownLabel(channel: "facebook" | "instagram"): string {
  const until = new Date(Date.now() + CHANNEL_COOLDOWN_MS);
  return `${channel === "instagram" ? "IG" : "FB"} en cooldown por límite de la app (30 min, hasta ~${until.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}). Los posts quedan pendientes: “Publicar” reintenta solo este canal.`;
}

/** Maps raw Graph errors into admin-readable messages + trip the breaker. */
function friendlyChannelError(
  channel: "facebook" | "instagram",
  message: string
): string {
  if (isAppRequestLimit(message)) {
    channelThrottledUntil[channel] = Date.now() + CHANNEL_COOLDOWN_MS;
    return cooldownLabel(channel);
  }
  if (channel === "instagram") {
    if (message.toLowerCase().includes("#9007") || message.toLowerCase().includes("media id was not found")) {
      return "IG: el contenedor expiró (24h) o la media ya no existe; reintentá la publicación.";
    }
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
  /** True when the queue did not run because auto-publish is off. */
  skipped?: boolean;
  /** Human-readable explanation when skipped. */
  reason?: string;
}

/**
 * Unattended publishing is OFF by default (MarketingSettings.autoPublish).
 *
 * The scheduled runners (Vercel cron + the GitHub Actions workflow) call
 * `runPublishQueue()` without `force`, so they publish nothing until the
 * admin flips the switch. The admin's own buttons ("Publicar", "Correr
 * cola") pass `force: true` — those are deliberate, manual actions.
 */
export async function isAutoPublishEnabled(): Promise<boolean> {
  const settings = await prisma.marketingSettings
    .findUnique({ where: { id: "default" }, select: { autoPublish: true } })
    .catch(() => null);
  return settings?.autoPublish === true;
}

/**
 * Publish queue: ready posts whose scheduledAt came due. Bounded per
 * invocation so one slow Meta call can't blow the route's time budget.
 * "Publicar ahora" paths publish immediately instead of going through here;
 * failures that leave lastError set still show in the post list.
 */
export async function runPublishQueue(
  limit = QUEUE_BATCH_SIZE,
  options: { force?: boolean } = {}
): Promise<QueueOutcome> {
  if (!options.force && !(await isAutoPublishEnabled())) {
    return {
      attempted: 0,
      publishedPosts: 0,
      failures: [],
      skipped: true,
      reason:
        "Publicación automática desactivada: la cola programada no publica nada. " +
        "Usá “Publicar” o “Correr cola” desde el admin, o activá el interruptor en Marketing.",
    };
  }

  const siteUrl = getSiteUrl();
  const due = await prisma.socialPost.findMany({
    where: {
      OR: [
        // Explicitly scheduled posts (ready + due).
        {
          status: "ready",
          publishedAt: null,
          scheduledAt: { lte: new Date() },
        },
        // Partial publishes (a channel failed, e.g. IG app-rate-limited):
        // the pending channel retries automatically, whatever the status.
        {
          publishedAt: { not: null },
          OR: [
            { channels: { has: "facebook" }, fbPostId: null },
            { channels: { has: "instagram" }, igMediaId: null },
          ],
        },
      ],
    },
    orderBy: { updatedAt: "asc" },
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
