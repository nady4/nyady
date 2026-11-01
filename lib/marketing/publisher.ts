import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/marketing/crypto";
import {
  publishFacebookPost,
  publishInstagramPost,
  publishInstagramReel,
  fetchIgPublishingQuota,
  fetchIgMediaList,
  type IgMediaItem,
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

/** Normalized caption for matching (case/accents/whitespace insensitive). */
export function captionKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Finds the IG media that already carries this post's caption.
 *
 * A publish whose media id never reached the database (the function died on
 * Vercel's 60 s budget right after `media_publish`) leaves the post "pending"
 * here while it is actually live on Instagram. Matching by caption lets us
 * ADOPT that media instead of publishing the same thing twice — which is
 * exactly how "Noe" ended up posted twice.
 */
export function matchIgMedia(
  items: IgMediaItem[],
  post: SocialPost,
  caption: string
): IgMediaItem | null {
  const key = captionKey(caption);
  if (!key) return null;
  const prefix = key.slice(0, 60);
  const firstLine = captionKey(post.body.split("\n")[0] ?? "");
  // The media must be at least as new as the post (1 h of slack for clock
  // drift), otherwise an old campaign with the same copy would be adopted.
  const since = post.createdAt.getTime() - 60 * 60_000;

  for (const item of items) {
    if (item.timestamp && item.timestamp < since) continue;
    const mediaKey = captionKey(item.caption);
    if (!mediaKey) continue;
    if (prefix && mediaKey.startsWith(prefix)) return item;
    if (firstLine && mediaKey.includes(firstLine)) return item;
  }
  return null;
}

/** IG media of the connected account (empty list when it cannot be read). */
async function loadIgMedia(account: {
  igUserId: string;
  pageToken: string;
}): Promise<IgMediaItem[]> {
  try {
    return await fetchIgMediaList(account.igUserId, account.pageToken, 50);
  } catch (error) {
    console.error("[marketing/publisher] ig media list failed:", error);
    return [];
  }
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

export type PublishChannel = "facebook" | "instagram";

export type ChannelResult =
  | { ok: true; id: string; url: string | null }
  | {
      ok: false;
      error: string;
      /**
       * Global/transient condition (Meta app-level limit, IG publish quota).
       * It is NOT a per-post failure, so it is never stored in
       * `SocialPost.lastError` — that is exactly what used to leave a red
       * "cooldown" error forever on posts that were already published. It is
       * surfaced once, as a banner, in the admin.
       */
      transient?: boolean;
      /** Epoch ms when the condition clears (cooldown end). */
      until?: number;
    };

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
    } else {
      const cooldown = await readCooldown("facebook");
      if (cooldown) {
        // Circuit breaker open: don't spend Graph calls while the app is
        // throttled — the post stays pending and can be retried later.
        results.facebook = {
          ok: false,
          error: cooldownMessage("facebook", cooldown),
          transient: true,
          until: cooldown.until,
        };
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
          const friendly = await friendlyChannelError(
            "facebook",
            error instanceof Error ? error.message : "Error publicando en Facebook"
          );
          results.facebook = { ok: false, ...friendly };
        }
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
    } else {
      const cooldown = await readCooldown("instagram");
      if (cooldown) {
        // Circuit breaker open: don't spend Graph calls while the app is
        // throttled — the post stays pending and can be retried later.
        results.instagram = {
          ok: false,
          error: cooldownMessage("instagram", cooldown),
          transient: true,
          until: cooldown.until,
        };
      } else if (!accounts.instagram) {
        results.instagram = { ok: false, error: "Instagram no está conectado" };
      } else {
        // Duplicate guard: if this post already went out (the media id was
        // lost when the function died), adopt the live media instead of
        // publishing the same thing twice.
        const existing = matchIgMedia(
          await loadIgMedia(accounts.instagram),
          post,
          instagramCaption
        );
        if (existing) {
          results.instagram = {
            ok: true,
            id: existing.id,
            url: existing.permalink ?? null,
          };
        } else {
          // IG reads its own caption: the link travels as plain text (no
          // hyperlink in IG captions). Media must be public https URLs.
          try {
            // The media id is written to the row the moment Instagram
            // confirms the publish, so a function that dies afterwards
            // (60 s budget on Vercel Hobby) never leaves a published post
            // looking pending — and a retry cannot duplicate it.
            const onPublished = async (mediaId: string) => {
              await prisma.socialPost.update({
                where: { id: post.id },
                data: {
                  igMediaId: mediaId,
                  publishedAt: post.publishedAt ?? new Date(),
                },
              });
            };
            const ig = isVideo
              ? await publishInstagramReel({
                  igUserId: accounts.instagram.igUserId,
                  pageToken: accounts.instagram.pageToken,
                  videoUrl: videoUrl ?? "",
                  caption: instagramCaption,
                  coverUrl: videoCover,
                  onPublished,
                })
              : await publishInstagramPost({
                  igUserId: accounts.instagram.igUserId,
                  pageToken: accounts.instagram.pageToken,
                  imageUrls: post.media.filter((url) => /^https:\/\//.test(url)),
                  caption: instagramCaption,
                  onPublished,
                });
            results.instagram = { ok: true, id: ig.id, url: ig.permalink ?? null };
          } catch (error) {
            const friendly = await friendlyChannelError(
              "instagram",
              error instanceof Error ? error.message : "Error publicando en Instagram",
              accounts.instagram
                ? {
                    igUserId: accounts.instagram.igUserId,
                    pageToken: accounts.instagram.pageToken,
                  }
                : null
            );
            results.instagram = { ok: false, ...friendly };
          }
        }
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
 * cooldown during which publish attempts short-circuit (no Graph calls at all)
 * and the posts stay pending; FB keeps publishing meanwhile.
 *
 * The breaker state lives in the DB (MarketingChannelState) on purpose: the
 * admin publishes post by post, and every click is a separate serverless
 * invocation, so an in-memory flag was reset before it could ever protect the
 * next call — each retry burned more quota and re-tripped the same limit.
 */
const APP_LIMIT_COOLDOWN_MS = 60 * 60_000; // Meta's app-level window is hourly
/** IG publishes 100 API posts per rolling 24 h (carousels count as one). */
const IG_PUBLISH_LIMIT_COOLDOWN_MS = 12 * 60 * 60_000;

interface ChannelCooldown {
  /** Epoch ms when the cooldown ends. */
  until: number;
  /** "app_limit" | "ig_publish_limit" — decides the message. */
  reason: string;
}

const cooldownCache: Record<PublishChannel, { at: number; state: ChannelCooldown | null }> = {
  facebook: { at: 0, state: null },
  instagram: { at: 0, state: null },
};
const COOLDOWN_CACHE_MS = 5_000;

/** Active cooldown for a channel (null when the channel can publish). */
async function readCooldown(channel: PublishChannel): Promise<ChannelCooldown | null> {
  const cached = cooldownCache[channel];
  if (Date.now() - cached.at < COOLDOWN_CACHE_MS) return cached.state;
  let state: ChannelCooldown | null = null;
  try {
    const row = await prisma.marketingChannelState.findUnique({ where: { channel } });
    if (row?.throttledUntil) {
      const until = row.throttledUntil.getTime();
      if (until > Date.now()) state = { until, reason: row.reason ?? "app_limit" };
    }
  } catch (error) {
    console.error("[marketing/publisher] cooldown read failed:", error);
  }
  cooldownCache[channel] = { at: Date.now(), state };
  return state;
}

async function writeCooldown(
  channel: PublishChannel,
  cooldown: ChannelCooldown
): Promise<void> {
  cooldownCache[channel] = { at: Date.now(), state: cooldown };
  try {
    await prisma.marketingChannelState.upsert({
      where: { channel },
      update: {
        throttledUntil: new Date(cooldown.until),
        reason: cooldown.reason,
      },
      create: {
        channel,
        throttledUntil: new Date(cooldown.until),
        reason: cooldown.reason,
      },
    });
  } catch (error) {
    console.error("[marketing/publisher] cooldown write failed:", error);
  }
}

/** Admin-facing description of the channels currently in cooldown. */
export async function channelCooldownStatus(): Promise<
  { channel: PublishChannel; until: number; message: string }[]
> {
  const channels: PublishChannel[] = ["facebook", "instagram"];
  const out: { channel: PublishChannel; until: number; message: string }[] = [];
  for (const channel of channels) {
    const cooldown = await readCooldown(channel);
    if (cooldown) {
      out.push({
        channel,
        until: cooldown.until,
        message: cooldownMessage(channel, cooldown),
      });
    }
  }
  return out;
}

export interface IgSyncReport {
  /** Posts that were live on IG but pending in the library — now adopted. */
  reconciled: { id: string; title: string; permalink: string | null }[];
  /** Posts still not on IG (they need a real publish). */
  missing: { id: string; title: string }[];
  /** IG media that matches no post in the library (candidate duplicates). */
  orphans: { id: string; permalink: string | null; caption: string }[];
}

/**
 * Reconciles the library with what is actually live on Instagram.
 *
 * When a publish dies after Instagram accepted it (the Vercel Hobby budget is
 * 60 s and a carousel burns most of it), the post stays "pending" here even
 * though it is online. This walks the account's recent media, adopts the
 * matching ones — so they are never published twice — and reports the IG
 * media that belongs to no post (duplicates to clean up by hand).
 */
export async function syncInstagramPosts(): Promise<IgSyncReport> {
  const accounts = await resolveMetaAccounts();
  const report: IgSyncReport = { reconciled: [], missing: [], orphans: [] };
  if (!accounts.instagram) throw new Error("Instagram no está conectado");

  const media = await loadIgMedia(accounts.instagram);
  const taken = new Set<string>();

  // 1) Pending posts: adopt the live media that carries their caption.
  const pending = await prisma.socialPost.findMany({
    where: { channels: { has: "instagram" }, igMediaId: null },
    orderBy: { createdAt: "asc" },
  });
  for (const post of pending) {
    const caption = buildMessage(post);
    const match = matchIgMedia(media, post, caption);
    if (!match) {
      report.missing.push({ id: post.id, title: post.title });
      continue;
    }
    taken.add(match.id);
    await prisma.socialPost.update({
      where: { id: post.id },
      data: {
        igMediaId: match.id,
        igPermalink: match.permalink ?? null,
        publishedAt: post.publishedAt ?? new Date(),
        lastError: null,
      },
    });
    report.reconciled.push({
      id: post.id,
      title: post.title,
      permalink: match.permalink ?? null,
    });
  }

  // 2) Posts already recorded: mark their media as taken too, so the leftovers
  //    are the real orphans (published twice, or published by hand).
  const recorded = await prisma.socialPost.findMany({
    where: { channels: { has: "instagram" }, igMediaId: { not: null } },
    select: { igMediaId: true },
  });
  for (const post of recorded) {
    if (post.igMediaId) taken.add(post.igMediaId);
  }

  for (const item of media) {
    if (taken.has(item.id)) continue;
    report.orphans.push({
      id: item.id,
      permalink: item.permalink ?? null,
      caption: item.caption.replace(/\s+/g, " ").trim().slice(0, 80),
    });
  }

  return report;
}

function isAppRequestLimit(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("application request limit") ||
    lower.includes('"code":4') ||
    lower.includes("(#4)") ||
    lower.includes("too many calls") ||
    lower.includes("rate limit")
  );
}

/** IG's own publishing quota (100 API posts / 24 h). */
function isIgPublishLimit(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("#2207042") ||
    lower.includes("content_publishing_limit") ||
    lower.includes("reduce the amount") ||
    lower.includes("maximum number of posts") ||
    lower.includes("too many posts") ||
    lower.includes("publishing limit")
  );
}

function clockLabel(until: number): string {
  // The admin works in Argentina time; the server (Vercel) runs on UTC, so the
  // zone is explicit — otherwise the "retry after HH:MM" hint is off by 3 h.
  return new Date(until).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function cooldownMessage(channel: PublishChannel, cooldown: ChannelCooldown): string {
  const who = channel === "instagram" ? "IG" : "FB";
  if (cooldown.reason === "ig_publish_limit") {
    return `${who} alcanzó el límite de publicación por API de Instagram (100 posts / 24 h). Los posts de ${who} quedan pendientes: “Publicar” reintenta solo ese canal (próximo intento ~${clockLabel(cooldown.until)}).`;
  }
  return `${who} está en cooldown por límite de la app de Meta (hasta ~${clockLabel(cooldown.until)}). No se gastan llamadas: los posts de ${who} quedan pendientes y “Publicar” reintenta solo ese canal.`;
}

/**
 * Maps raw Graph errors into admin-readable messages. Rate-limit errors are
 * GLOBAL: they trip the breaker (persisted in the DB) and come back as
 * `transient` so they are never stored as the post's own error.
 */
async function friendlyChannelError(
  channel: PublishChannel,
  message: string,
  igAccount?: { igUserId: string; pageToken: string } | null
): Promise<{ error: string; transient?: boolean; until?: number }> {
  const limitHit =
    isAppRequestLimit(message) || (channel === "instagram" && isIgPublishLimit(message));

  if (limitHit) {
    let reason = "app_limit";
    let detail = "";
    if (channel === "instagram" && igAccount) {
      // One extra call tells us WHICH limit was hit: Meta's app-level call
      // budget (retry in ~1 h) or the IG publishing quota (retry in hours).
      const quota = await fetchIgPublishingQuota(igAccount.igUserId, igAccount.pageToken);
      if (quota && quota.total > 0 && quota.used >= quota.total) {
        reason = "ig_publish_limit";
        detail = ` (${quota.used}/${quota.total} publicaciones usadas en la ventana de 24 h)`;
      }
    }
    const until = Date.now() + (reason === "ig_publish_limit" ? IG_PUBLISH_LIMIT_COOLDOWN_MS : APP_LIMIT_COOLDOWN_MS);
    const cooldown: ChannelCooldown = { until, reason };
    await writeCooldown(channel, cooldown);
    return {
      error: `${cooldownMessage(channel, cooldown)}${detail}`,
      transient: true,
      until,
    };
  }

  if (channel === "instagram") {
    if (
      message.toLowerCase().includes("#9007") ||
      message.toLowerCase().includes("media id was not found")
    ) {
      return { error: "IG: el contenedor expiró (24h) o la media ya no existe; reintentá la publicación." };
    }
  }
  return { error: message };
}

interface PersistedResults {
  publishedAt: Date | null;
  errors: string[];
  /** True when every failure of this attempt was a global/transient one. */
  transient?: boolean;
}

/** Splits a stored `lastError` back into its per-channel parts. */
function splitChannelErrors(text: string | null): Record<PublishChannel, string> {
  const out: Record<PublishChannel, string> = { facebook: "", instagram: "" };
  if (!text) return out;
  for (const line of text.split("\n")) {
    for (const segment of line.split(/\s·\s/)) {
      const match = /^(facebook|instagram):\s*(.+)$/.exec(segment.trim());
      if (match) out[match[1] as PublishChannel] = match[2].trim();
    }
  }
  return out;
}

/**
 * Persist publish results on the post row (partial-failure safe).
 *
 * Errors belong to a CHANNEL, not to the post: a channel that publishes drops
 * its old error, and a transient/global failure (Meta app-level limit, IG
 * quota) is never stored here — it lives in the channel cooldown and is shown
 * as a banner. That is what keeps published posts from keeping a red error
 * forever.
 */
export async function persistPublishResults(
  post: SocialPost,
  results: PublishResults["results"]
): Promise<PersistedResults> {
  const errors: string[] = [];
  let transient = true;
  for (const [channel, result] of Object.entries(results)) {
    if (result.ok) continue;
    errors.push(`${channel}: ${result.error}`);
    if (!result.transient) transient = false;
  }
  if (errors.length === 0) transient = false;

  // Channel state AFTER this attempt.
  const fbPostId =
    results.facebook?.ok && results.facebook.id ? results.facebook.id : post.fbPostId;
  const igMediaId =
    results.instagram?.ok && results.instagram.id ? results.instagram.id : post.igMediaId;

  const previous = splitChannelErrors(post.lastError);
  const stored: string[] = [];
  const pending: PublishChannel[] = [];
  if (post.channels.includes("facebook") && !fbPostId) pending.push("facebook");
  if (post.channels.includes("instagram") && !igMediaId) pending.push("instagram");
  for (const channel of pending) {
    const attempt = results[channel];
    const fresh = attempt && !attempt.ok && !attempt.transient ? attempt.error : "";
    const error = fresh || previous[channel];
    if (error) stored.push(`${channel}: ${error}`);
  }

  const data: {
    publishedAt?: Date;
    lastError?: string | null;
    fbPostId?: string;
    fbPermalink?: string | null;
    igMediaId?: string;
    igPermalink?: string | null;
  } = { lastError: stored.length > 0 ? stored.join(" · ") : null };

  if (results.facebook?.ok && results.facebook.id) {
    data.fbPostId = results.facebook.id;
    data.fbPermalink = results.facebook.url;
  }
  if (results.instagram?.ok && results.instagram.id) {
    data.igMediaId = results.instagram.id;
    data.igPermalink = results.instagram.url;
  }
  const anyOk = results.facebook?.ok || results.instagram?.ok;
  // Keep the FIRST publish time: a later channel retry must not move it.
  if (anyOk && !post.publishedAt) data.publishedAt = new Date();

  await prisma.socialPost.update({ where: { id: post.id }, data });
  return { publishedAt: data.publishedAt ?? null, errors, transient };
}

/** Publish one post row and persist the outcome. */
export async function publishAndPersist(
  post: SocialPost,
  siteUrl: string
): Promise<PublishResults["results"]> {
  const { results } = await publishPostEverywhere(post, siteUrl);
  await persistPublishResults(post, results);
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
