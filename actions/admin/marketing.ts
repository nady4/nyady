"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ensureAdmin } from "@/lib/admin";
import { deleteOrphanBlobs, isManagedBlob } from "@/lib/admin/blob";
import { getSiteUrl } from "@/lib/site-url";
import { formatARS } from "@/lib/admin/format";
import { toMarketingProductOption } from "@/lib/marketing/product-option";
import { isMetaConfigured } from "@/lib/marketing/meta";
import {
  publishAndPersist,
  runPublishQueue,
} from "@/lib/marketing/publisher";
import { runInsightsSync } from "@/lib/marketing/insights";
import {
  COPY_CHANNELS,
  type CopyChannel,
  generateCopyVariants,
} from "@/lib/marketing/ai";
import type {
  AdminActionResult,
  MarketingProductOption,
} from "@/types/admin";

const MAX_BODY = 4000;
const MAX_TITLE = 120;
const MAX_MEDIA = 10;
const MAX_HASHTAGS = 30;
const MAX_TAGS_PER_HASHTAG = 40;

function revalidateMarketing() {
  revalidatePath("/admin");
  revalidatePath("/admin/marketing");
}

// --- Validation helpers ------------------------------------------------------

interface PostInput {
  title: string;
  body: string;
  hashtags: string[];
  channels: string[];
  media: string[];
  productId: string | null;
  campaign: string | null;
  status: "draft" | "ready";
  scheduledAt: string | null;
}

function validHttpUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/")) {
    return /^\/[A-Za-z0-9\-._~\/]+$/.test(url) && !url.includes("..");
  }
  return /^https?:\/\//.test(url);
}

export interface MarketingPostData {
  title: string;
  body: string;
  hashtags: string[];
  channels: string[];
  media: string[];
  productId: string | null;
  campaign: string | null;
  status: string;
  scheduledAt: Date | null;
}

function parsePostInput(input: PostInput): {
  ok: boolean;
  error?: string;
  data?: MarketingPostData;
} {
  const title = (input.title ?? "").trim();
  if (!title || title.length > MAX_TITLE) {
    return { ok: false, error: `El título es obligatorio (máx. ${MAX_TITLE})` };
  }

  const body = (input.body ?? "").trim();
  if (!body) return { ok: false, error: "El copy del post es obligatorio" };
  if (body.length > MAX_BODY) {
    return { ok: false, error: `El copy es demasiado largo (máx. ${MAX_BODY})` };
  }

  // Hashtags: strip a leading "#", drop empties/duplicates, cap count/length.
  const hashtags: string[] = [];
  for (const raw of input.hashtags ?? []) {
    const tag = String(raw ?? "")
      .trim()
      .replace(/^#/, "");
    if (!tag) continue;
    if (tag.length > MAX_TAGS_PER_HASHTAG) {
      return { ok: false, error: `El hashtag "${tag.slice(0, 20)}…" es demasiado largo` };
    }
    if (!hashtags.some((h) => h.toLowerCase() === tag.toLowerCase())) {
      hashtags.push(tag);
    }
    if (hashtags.length >= MAX_HASHTAGS) break;
  }

  const channels = (input.channels ?? []).filter((c) =>
    COPY_CHANNELS.includes(c as CopyChannel)
  );
  if (channels.length === 0) {
    return { ok: false, error: "Elegí al menos un canal (Facebook, Instagram o WhatsApp)" };
  }

  const media: string[] = [];
  for (const raw of input.media ?? []) {
    const url = String(raw ?? "").trim();
    if (!url) continue;
    if (!validHttpUrl(url)) {
      return { ok: false, error: "Una de las imágenes tiene una URL inválida" };
    }
    if (!media.includes(url)) media.push(url);
    if (media.length >= MAX_MEDIA) break;
  }

  const campaign = input.campaign?.trim().slice(0, 60) || null;
  const status = input.status === "ready" ? "ready" : "draft";
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, error: "La fecha de publicación programada es inválida" };
  }

  return {
    ok: true,
    data: {
      title,
      body,
      hashtags,
      channels,
      media,
      productId: input.productId?.trim() || null,
      campaign,
      status,
      scheduledAt,
    },
  };
}

// --- Posts -------------------------------------------------------------------

async function validateProductExists(productId: string | null): Promise<boolean> {
  if (!productId) return true;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  return Boolean(product);
}

export async function createMarketingPostAction(
  input: PostInput
): Promise<AdminActionResult & { postId?: string }> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  const parsed = parsePostInput(input);
  if (!parsed.ok || !parsed.data) return { ok: false, error: parsed.error };
  if (!(await validateProductExists(parsed.data.productId))) {
    return { ok: false, error: "Producto inexistente" };
  }

  try {
    const post = await prisma.socialPost.create({ data: parsed.data });
    revalidateMarketing();
    return { ok: true, postId: post.id };
  } catch (error) {
    console.error("[admin/marketing] post create failed:", error);
    return { ok: false, error: "No se pudo crear el post" };
  }
}

export async function updateMarketingPostAction(
  postId: string,
  input: PostInput
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  const existing = await prisma.socialPost.findUnique({
    where: { id: postId },
    select: { media: true },
  });
  if (!existing) return { ok: false, error: "Post inexistente" };

  const parsed = parsePostInput(input);
  if (!parsed.ok || !parsed.data) return { ok: false, error: parsed.error };
  const data = parsed.data;
  if (!(await validateProductExists(data.productId))) {
    return { ok: false, error: "Producto vinculado inexistente" };
  }

  try {
    await prisma.socialPost.update({
      where: { id: postId },
      data,
    });
  } catch (error) {
    console.error("[admin/marketing] post update failed:", error);
    return { ok: false, error: "No se pudo actualizar el post" };
  }

  // Blob cleanup for removed images (best-effort).
  const removed = existing.media.filter((url) => !data.media.includes(url));
  if (removed.length > 0) await deleteOrphanBlobs(null, removed);

  revalidateMarketing();
  return { ok: true };
}

export async function duplicateMarketingPostAction(
  postId: string
): Promise<AdminActionResult & { postId?: string }> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  const source = await prisma.socialPost.findUnique({ where: { id: postId } });
  if (!source) return { ok: false, error: "Post inexistente" };

  try {
    const copy = await prisma.socialPost.create({
      data: {
        title: `${source.title} (copia)`.slice(0, MAX_TITLE),
        body: source.body,
        hashtags: source.hashtags,
        channels: source.channels,
        media: source.media,
        productId: source.productId,
        campaign: source.campaign,
        status: "draft",
        scheduledAt: null,
      },
    });
    revalidateMarketing();
    return { ok: true, postId: copy.id };
  } catch (error) {
    console.error("[admin/marketing] post duplicate failed:", error);
    return { ok: false, error: "No se pudo duplicar el post" };
  }
}

export async function toggleMarketingPostStatusAction(
  postId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    select: { status: true },
  });
  if (!post) return { ok: false, error: "Post inexistente" };

  try {
    await prisma.socialPost.update({
      where: { id: postId },
      data: { status: post.status === "ready" ? "draft" : "ready" },
    });
  } catch (error) {
    console.error("[admin/marketing] post toggle failed:", error);
    return { ok: false, error: "No se pudo actualizar el post" };
  }

  revalidateMarketing();
  return { ok: true };
}

export async function deleteMarketingPostAction(
  postId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    select: { media: true },
  });
  if (!post) return { ok: false, error: "Post inexistente" };

  try {
    await prisma.socialPost.delete({ where: { id: postId } });
  } catch (error) {
    console.error("[admin/marketing] post delete failed:", error);
    return { ok: false, error: "No se pudo eliminar el post" };
  }

  const managed = post.media.filter((url) => isManagedBlob(url));
  if (managed.length > 0) await deleteOrphanBlobs(null, managed);

  revalidateMarketing();
  return { ok: true };
}

// --- Copy templates ----------------------------------------------------------

interface TemplateInput {
  name: string;
  body: string;
  hashtags: string[];
}

function parseTemplateInput(input: TemplateInput): {
  ok: boolean;
  error?: string;
  data?: { name: string; body: string; hashtags: string[] };
} {
  const name = (input.name ?? "").trim();
  if (!name || name.length > 80) {
    return { ok: false, error: "El nombre de la plantilla es obligatorio (máx. 80)" };
  }
  const body = (input.body ?? "").trim();
  if (!body || body.length > MAX_BODY) {
    return { ok: false, error: `El texto de la plantilla es obligatorio (máx. ${MAX_BODY})` };
  }
  const hashtags: string[] = [];
  for (const raw of input.hashtags ?? []) {
    const tag = String(raw ?? "").trim().replace(/^#/, "");
    if (tag && !hashtags.some((h) => h.toLowerCase() === tag.toLowerCase())) {
      hashtags.push(tag);
    }
    if (hashtags.length >= MAX_HASHTAGS) break;
  }
  return { ok: true, data: { name, body, hashtags } };
}

export async function createMarketingTemplateAction(
  input: TemplateInput
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };
  const parsed = parseTemplateInput(input);
  if (!parsed.ok || !parsed.data) return { ok: false, error: parsed.error };

  try {
    await prisma.copyTemplate.create({ data: parsed.data });
  } catch (error) {
    console.error("[admin/marketing] template create failed:", error);
    return { ok: false, error: "No se pudo crear la plantilla" };
  }
  revalidateMarketing();
  return { ok: true };
}

export async function updateMarketingTemplateAction(
  templateId: string,
  input: TemplateInput
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };
  const parsed = parseTemplateInput(input);
  if (!parsed.ok || !parsed.data) return { ok: false, error: parsed.error };

  try {
    await prisma.copyTemplate.update({ where: { id: templateId }, data: parsed.data });
  } catch (error) {
    console.error("[admin/marketing] template update failed:", error);
    return { ok: false, error: "No se pudo actualizar la plantilla" };
  }
  revalidateMarketing();
  return { ok: true };
}

export async function deleteMarketingTemplateAction(
  templateId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };
  try {
    await prisma.copyTemplate.delete({ where: { id: templateId } });
  } catch (error) {
    console.error("[admin/marketing] template delete failed:", error);
    return { ok: false, error: "No se pudo eliminar la plantilla" };
  }
  revalidateMarketing();
  return { ok: true };
}

// --- Assets ------------------------------------------------------------------

export async function createMarketingAssetAction(
  url: string,
  productId: string | null,
  tag: string | null
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  const cleanUrl = (url ?? "").trim();
  if (!validHttpUrl(cleanUrl)) {
    return { ok: false, error: "URL de imagen inválida" };
  }

  if (productId) {
    const exists = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!exists) return { ok: false, error: "Producto inexistente" };
  }

  try {
    await prisma.socialAsset.create({
      data: {
        url: cleanUrl,
        productId: productId || null,
        tag: tag?.trim().slice(0, 40) || null,
      },
    });
  } catch (error) {
    console.error("[admin/marketing] asset create failed:", error);
    return { ok: false, error: "No se pudo guardar la imagen" };
  }
  revalidateMarketing();
  return { ok: true };
}

export async function updateMarketingAssetAction(
  assetId: string,
  tag: string | null
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };
  try {
    await prisma.socialAsset.update({
      where: { id: assetId },
      data: { tag: tag?.trim().slice(0, 40) || null },
    });
  } catch (error) {
    console.error("[admin/marketing] asset update failed:", error);
    return { ok: false, error: "No se pudo actualizar la imagen" };
  }
  revalidateMarketing();
  return { ok: true };
}

export async function deleteMarketingAssetAction(
  assetId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  const asset = await prisma.socialAsset.findUnique({
    where: { id: assetId },
    select: { url: true },
  });
  if (!asset) return { ok: false, error: "Imagen inexistente" };

  try {
    await prisma.socialAsset.delete({ where: { id: assetId } });
  } catch (error) {
    console.error("[admin/marketing] asset delete failed:", error);
    return { ok: false, error: "No se pudo eliminar la imagen" };
  }

  // ownerId = asset id so the just-deleted row doesn't "protect" its own blob.
  if (isManagedBlob(asset.url)) await deleteOrphanBlobs(assetId, [asset.url]);

  revalidateMarketing();
  return { ok: true };
}

// --- Settings ----------------------------------------------------------------

interface MarketingSettingsInput {
  brandVoice: string | null;
  defaultHashtags: string[];
  instagramHandle: string | null;
  whatsappPhone: string | null;
}

export async function saveMarketingSettingsAction(
  input: MarketingSettingsInput
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  const brandVoice = input.brandVoice?.trim() || null;
  if (brandVoice && brandVoice.length > 1500) {
    return { ok: false, error: "La voz de marca es demasiado larga (máx. 1500)" };
  }
  const defaultHashtags: string[] = [];
  for (const raw of input.defaultHashtags ?? []) {
    const tag = String(raw ?? "").trim().replace(/^#/, "");
    if (tag && !defaultHashtags.some((h) => h.toLowerCase() === tag.toLowerCase())) {
      defaultHashtags.push(tag);
    }
    if (defaultHashtags.length >= MAX_HASHTAGS) break;
  }
  const instagramHandle =
    input.instagramHandle?.trim().replace(/^@/, "")?.slice(0, 40) || null;
  const whatsappPhone = input.whatsappPhone?.replace(/[^\d+]/g, "").slice(0, 16) || null;

  try {
    await prisma.marketingSettings.upsert({
      where: { id: "default" },
      update: { brandVoice, defaultHashtags, instagramHandle, whatsappPhone },
      create: {
        id: "default",
        brandVoice,
        defaultHashtags,
        instagramHandle,
        whatsappPhone,
      },
    });
  } catch (error) {
    console.error("[admin/marketing] settings save failed:", error);
    return { ok: false, error: "No se pudo guardar la configuración" };
  }
  revalidateMarketing();
  return { ok: true };
}

// --- Product picker ------------------------------------------------------------

export async function searchMarketingProductsAction(
  q: string
): Promise<{ ok: boolean; error?: string; products?: MarketingProductOption[] }> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  const term = q.trim();
  const where = term
    ? {
        archivedAt: null,
        OR: [
          { name: { contains: term, mode: "insensitive" as const } },
          { code: { contains: term, mode: "insensitive" as const } },
          { category: { contains: term, mode: "insensitive" as const } },
        ],
      }
    : { archivedAt: null };

  try {
    const rows = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        photo: true,
        photos: true,
        category: true,
        colors: true,
        sizes: true,
        description: true,
      },
    });
    return { ok: true, products: rows.map(toMarketingProductOption) };
  } catch (error) {
    console.error("[admin/marketing] product search failed:", error);
    return { ok: false, error: "No se pudo buscar productos" };
  }
}

// --- AI copy generation --------------------------------------------------------

export interface GenerateCopyInput {
  manualBrief: string;
  tone: number;
  channels: string[];
  productId: string | null;
}

export interface GenerateCopyResult {
  ok: boolean;
  error?: string;
  variants?: {
    hook: string;
    body: string;
    hashtags: string[];
    cta: string;
  }[];
}

export async function generateMarketingCopyAction(
  input: GenerateCopyInput
): Promise<GenerateCopyResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const settings = await prisma.marketingSettings.findUnique({
    where: { id: "default" },
  });

  let product: {
    name: string;
    slug: string;
    price: number;
    category: string;
    colors: string[];
    sizes: string[];
    description: string | null;
  } | null = null;
  if (input.productId) {
    const row = await prisma.product.findUnique({
      where: { id: input.productId },
      select: {
        name: true,
        slug: true,
        price: true,
        category: true,
        colors: true,
        sizes: true,
        description: true,
      },
    });
    if (!row) return { ok: false, error: "Producto inexistente" };
    product = {
      name: row.name,
      slug: row.slug,
      price: row.price.toNumber(),
      category: row.category,
      colors: row.colors,
      sizes: row.sizes,
      description: row.description,
    };
  }

  const channels = input.channels.filter((c) =>
    COPY_CHANNELS.includes(c as CopyChannel)
  );

  return generateCopyVariants({
    brandVoice: settings?.brandVoice ?? null,
    defaultHashtags: settings?.defaultHashtags ?? [],
    manualBrief: (input.manualBrief ?? "").trim().slice(0, 800),
    tone: Number(input.tone) || 0,
    channels: channels as CopyChannel[],
    siteUrl: getSiteUrl(),
    instagramHandle: settings?.instagramHandle ?? null,
    product,
  });
}

// --- Publishing (phase 2) ------------------------------------------------------

export interface PublishPostActionResult {
  ok: boolean;
  error?: string;
  results?: Partial<{
    facebook: { ok: boolean; url: string | null; error?: string };
    instagram: { ok: boolean; url: string | null; error?: string };
  }>;
}

export async function publishMarketingPostAction(
  postId: string
): Promise<PublishPostActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  const post = await prisma.socialPost.findUnique({ where: { id: postId } });
  if (!post) return { ok: false, error: "Post inexistente" };
  if (!post.channels.some((c) => c === "facebook" || c === "instagram")) {
    return { ok: false, error: "El post no apunta a Facebook ni Instagram" };
  }
  if (!isMetaConfigured()) {
    return { ok: false, error: "Falta META_APP_ID / META_APP_SECRET en el entorno" };
  }

  // Nothing left to publish: both requested channels already have external
  // ids (avoids accidental double-posting from double clicks).
  const pendingFacebook =
    post.channels.includes("facebook") && !post.fbPostId;
  const pendingInstagram =
    post.channels.includes("instagram") && !post.igMediaId;
  if (!pendingFacebook && !pendingInstagram) {
    return {
      ok: false,
      error: "Ya está publicado en todos sus canales Meta (nada pendiente).",
    };
  }

  try {
    const results = await publishAndPersist(post, getSiteUrl());
    revalidateMarketing();
    return {
      ok: true,
      results: {
        facebook: results.facebook
          ? {
              ok: results.facebook.ok,
              url: results.facebook.ok ? results.facebook.url : null,
              error: results.facebook.ok ? undefined : results.facebook.error,
            }
          : undefined,
        instagram: results.instagram
          ? {
              ok: results.instagram.ok,
              url: results.instagram.ok ? results.instagram.url : null,
              error: results.instagram.ok ? undefined : results.instagram.error,
            }
          : undefined,
      },
    };
  } catch (error) {
    console.error("[admin/marketing] publish failed:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error publicando en Meta",
    };
  }
}

export async function runPublishQueueAction(): Promise<{
  ok: boolean;
  error?: string;
  attempted?: number;
  published?: number;
  failures?: string[];
}> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  try {
    const outcome = await runPublishQueue();
    revalidateMarketing();
    return {
      ok: true,
      attempted: outcome.attempted,
      published: outcome.publishedPosts,
      failures: outcome.failures,
    };
  } catch (error) {
    console.error("[admin/marketing] queue failed:", error);
    return { ok: false, error: "No se pudo correr el queue de publicación" };
  }
}

export async function disconnectMetaAction(channel: string): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };
  if (channel !== "facebook" && channel !== "instagram") {
    return { ok: false, error: "Canal inválido" };
  }

  try {
    await prisma.socialAccount.deleteMany({ where: { channel } });
  } catch (error) {
    console.error("[admin/marketing] disconnect failed:", error);
    return { ok: false, error: "No se pudo desconectar la cuenta" };
  }
  revalidateMarketing();
  return { ok: true };
}

export async function syncMarketingInsightsAction(): Promise<{
  ok: boolean;
  error?: string;
  postsSynced?: number;
  postsFailed?: number;
  followers?: { facebook: number | null; instagram: number | null };
}> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };
  if (!isMetaConfigured()) {
    return { ok: false, error: "Falta META_APP_ID / META_APP_SECRET en el entorno" };
  }

  try {
    const outcome = await runInsightsSync();
    revalidateMarketing();
    return {
      ok: true,
      postsSynced: outcome.postsSynced,
      postsFailed: outcome.postsFailed,
      followers: outcome.followers,
    };
  } catch (error) {
    console.error("[admin/marketing] insights sync failed:", error);
    return { ok: false, error: "No se pudo sincronizar las estadísticas" };
  }
}

// --- Manual WhatsApp campaigns (phase 4, no Cloud API) --------------------------

interface WaCampaignInput {
  name: string;
  bodyText: string;
}

export async function createWaCampaignAction(
  input: WaCampaignInput
): Promise<AdminActionResult & { campaignId?: string }> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  const name = (input.name ?? "").trim();
  const bodyText = (input.bodyText ?? "").trim();
  if (!name || name.length > 80) {
    return { ok: false, error: "El nombre de la campaña es obligatorio (máx. 80)" };
  }
  if (!bodyText || bodyText.length > 2000) {
    return { ok: false, error: "Escribí el mensaje (máx. 2000)" };
  }

  try {
    const campaign = await prisma.whatsAppCampaign.create({
      data: { name, bodyText },
    });
    revalidateMarketing();
    return { ok: true, campaignId: campaign.id };
  } catch (error) {
    console.error("[admin/marketing/wa] create failed:", error);
    return { ok: false, error: "No se pudo crear la campaña" };
  }
}

export async function updateWaCampaignAction(
  campaignId: string,
  input: WaCampaignInput
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  const name = (input.name ?? "").trim();
  const bodyText = (input.bodyText ?? "").trim();
  if (!name || name.length > 80) {
    return { ok: false, error: "El nombre de la campaña es obligatorio (máx. 80)" };
  }
  if (!bodyText || bodyText.length > 2000) {
    return { ok: false, error: "Escribí el mensaje (máx. 2000)" };
  }

  try {
    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: { name, bodyText },
    });
  } catch (error) {
    console.error("[admin/marketing/wa] update failed:", error);
    return { ok: false, error: "No se pudo actualizar la campaña" };
  }
  revalidateMarketing();
  return { ok: true };
}

export async function deleteWaCampaignAction(
  campaignId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };
  try {
    await prisma.whatsAppCampaign.delete({ where: { id: campaignId } });
  } catch (error) {
    console.error("[admin/marketing/wa] delete failed:", error);
    return { ok: false, error: "No se pudo eliminar la campaña" };
  }
  revalidateMarketing();
  return { ok: true };
}

export async function markWaSentAction(
  campaignId: string,
  phone: string,
  name: string | null
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };
  if (!/^\d{10,15}$/.test(phone)) {
    return { ok: false, error: "Teléfono inválido" };
  }

  try {
    await prisma.whatsAppCampaignSend.upsert({
      where: { campaignId_phone: { campaignId, phone } },
      update: { sentAt: new Date(), name },
      create: { campaignId, phone, name },
    });
  } catch (error) {
    console.error("[admin/marketing/wa] mark sent failed:", error);
    return { ok: false, error: "No se pudo marcar el envío" };
  }
  revalidateMarketing();
  return { ok: true };
}

export async function unmarkWaSentAction(
  campaignId: string,
  phone: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };
  try {
    await prisma.whatsAppCampaignSend.deleteMany({
      where: { campaignId, phone },
    });
  } catch (error) {
    console.error("[admin/marketing/wa] unmark failed:", error);
    return { ok: false, error: "No se pudo desmarcar el envío" };
  }
  revalidateMarketing();
  return { ok: true };
}

// --- Bulk creation (IG/FB posts per product) ------------------------------------

export type BulkPhotoMode = "all" | "cover_per_color" | "cover_only";

export interface BulkCreateInput {
  productIds: string[];
  templateId: string | null; // null = free-text mode
  customBody: string; // used when templateId is null (raw with placeholders)
  useAi: boolean;
  tone: number;
  photoMode: BulkPhotoMode;
  hasChannels: ("facebook" | "instagram")[];
  campaign: string;
}

export interface BulkCreateOutcome {
  ok: boolean;
  error?: string;
  results?: { productId: string; productName: string; postId?: string; error?: string }[];
  skipped?: { productId: string; reason: string }[];
  created?: number;
}

const BULK_MAX_PRODUCTS = 25;
const IG_PHOTO_LIMIT = 10;
const BULK_PLACEHOLDERS = ["{producto}", "{precio}", "{link}", "{tallas}", "{colores}"];
void BULK_PLACEHOLDERS;

/** Cover first, then per-color bucket urls — same order the composer shows. */
function productPhotoUrlsFor(row: { photo: string; photos: unknown }): string[] {
  const urls: string[] = [];
  if (row.photo) urls.push(row.photo);
  if (row.photos && typeof row.photos === "object" && !Array.isArray(row.photos)) {
    for (const list of Object.values(row.photos as Record<string, unknown>)) {
      if (Array.isArray(list)) {
        for (const url of list) {
          if (typeof url === "string" && url && !urls.includes(url)) urls.push(url);
        }
      }
    }
  }
  return urls;
}

function selectPhotos(
  productPhotoUrls: string[],
  mode: BulkPhotoMode
): { media: string[]; discarded: number } {
  if (mode === "cover_only") {
    return { media: productPhotoUrls.slice(0, 1), discarded: 0 };
  }
  if (mode === "cover_per_color") {
    const links: string[] = [];
    if (productPhotoUrls[0]) links.push(productPhotoUrls[0]);
    // One representative photo per color bucket after the cover.
    for (const url of productPhotoUrls.slice(1)) {
      if (links.length >= IG_PHOTO_LIMIT) break;
      if (!links.includes(url)) links.push(url);
    }
    return {
      media: links.slice(0, IG_PHOTO_LIMIT),
      discarded: Math.max(0, productPhotoUrls.length - IG_PHOTO_LIMIT),
    };
  }
  return {
    media: productPhotoUrls.slice(0, IG_PHOTO_LIMIT),
    discarded: Math.max(0, productPhotoUrls.length - IG_PHOTO_LIMIT),
  };
}

export async function createBulkPostsAction(
  input: BulkCreateInput
): Promise<BulkCreateOutcome> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  const productIds = [...new Set(input.productIds ?? [])].filter(Boolean);
  if (productIds.length === 0) {
    return { ok: false, error: "Elegí al menos un producto" };
  }
  if (productIds.length > BULK_MAX_PRODUCTS) {
    return { ok: false, error: `Máximo ${BULK_MAX_PRODUCTS} productos por corrida` };
  }
  const channels = (input.hasChannels ?? []).filter(
    (c) => c === "facebook" || c === "instagram"
  );
  if (channels.length === 0) {
    return { ok: false, error: "Elegí al menos un canal (Facebook o Instagram)" };
  }

  // Template or free-text body source.
  let templateBody: string | null = null;
  let templateHashtags: string[] = [];
  if (input.templateId) {
    const template = await prisma.copyTemplate.findUnique({
      where: { id: input.templateId },
      select: { body: true, hashtags: true },
    });
    if (!template) return { ok: false, error: "Plantilla inexistente" };
    templateBody = template.body;
    templateHashtags = template.hashtags;
  } else {
    const custom = (input.customBody ?? "").trim();
    if (!custom) {
      return { ok: false, error: "Escribí el texto o elegí una plantilla" };
    }
    templateBody = custom;
  }

  // Default brand hashtags travel with every bulk draft (merged with the
  // product's category tag).
  const marketingSettings = await prisma.marketingSettings.findUnique({
    where: { id: "default" },
    select: { defaultHashtags: true },
  });
  const defaultHashtags = marketingSettings?.defaultHashtags ?? [];

  const campaign = input.campaign?.trim().slice(0, 60) || null;
  const siteUrl = getSiteUrl();
  const results: NonNullable<BulkCreateOutcome["results"]> = [];
  const skipped: NonNullable<BulkCreateOutcome["skipped"]> = [];
  let created = 0;

  for (const productId of productIds) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        photo: true,
        photos: true,
        category: true,
        colors: true,
        sizes: true,
        description: true,
        archivedAt: true,
      },
    });
    if (!product || product.archivedAt) {
      skipped.push({ productId, reason: "Producto inexistente o archivado" });
      continue;
    }
    const { price } = product;
    const priceValue = price.toNumber();
    const photoUrls = productPhotoUrlsFor(product);
    if (photoUrls.length === 0) {
      skipped.push({ productId, reason: "El producto no tiene fotos" });
      continue;
    }
    const { media, discarded } = selectPhotos(photoUrls, input.photoMode);

    // Body: template/text with real data, optionally AI-polished per product.
    let body = (templateBody ?? "")
      .replaceAll("{producto}", product.name)
      .replaceAll("{precio}", formatARS(priceValue))
      .replaceAll("{link}", `${siteUrl}/products/${product.slug}`)
      .replaceAll(
        "{tallas}",
        product.sizes.length > 0 ? product.sizes.join(", ") : "-"
      )
      .replaceAll(
        "{colores}",
        product.colors.length > 0 ? product.colors.join(", ") : "-"
      );

    let variantHashtags: string[] = [];
    if (input.useAi) {
      const ai = await generateMarketingCopyAction({
        manualBrief:
          `Partí del siguiente texto y devolveme una mejor redacción, respetando TODA la data real (precio, talles, link) sin inventar nada:\n\n${body}`.slice(
            0,
            800
          ),
        tone: Number(input.tone) || 0,
        channels: ["instagram"],
        productId,
      });
      if (ai.ok && ai.variants && ai.variants.length > 0) {
        const variant = ai.variants[0];
        variantHashtags = variant.hashtags;
        body = [
          variant.hook.trim(),
          variant.body.trim(),
          variant.cta.trim(),
        ]
          .filter(Boolean)
          .join("\n\n");
      } else {
        skipped.push({
          productId,
          reason: `IA sin variants (${ai.error ?? "?"}): se guardó con el texto de la plantilla`,
        });
      }
    }

    const createResult = await createMarketingPostAction({
      title: `${product.name}`.slice(0, 120),
      body,
      hashtags: (() => {
        const merged: string[] = [];
        for (const tag of [
          ...defaultHashtags,
          ...templateHashtags,
          ...variantHashtags,
          product.category.toLowerCase().replace(/\s+/g, ""),
        ]) {
          const clean = tag?.trim().replace(/^#+/, "");
          if (clean && !merged.some((h) => h.toLowerCase() === clean.toLowerCase())) {
            merged.push(clean);
          }
        }
        return merged;
      })(),
      channels,
      media,
      productId,
      campaign: campaign ?? null,
      status: "draft",
      scheduledAt: null,
    });
    if (createResult.ok) {
      created += 1;
      results.push({
        productId,
        productName: product.name,
        postId: createResult.postId,
      });
      if (discarded > 0) {
        results.push({
          productId: `${productId}-note`,
          productName: product.name,
          error: `${discarded} fotos quedaron fuera del cap de ${IG_PHOTO_LIMIT} (editalas en el composer)`,
        });
      }
    } else {
      results.push({
        productId,
        productName: product.name,
        error: createResult.error ?? "No se pudo crear el post",
      });
    }
  }

  revalidateMarketing();
  return { ok: true, results, skipped, created };
}

/** Fresh template list for clients whose page data pre-dates a template CRUD
 * (avoids picking a template and seeing the old body until manual reload). */
export async function getMarketingTemplatesAction(): Promise<{
  ok: boolean;
  error?: string;
  templates?: { id: string; name: string; body: string; hashtags: string[] }[];
}> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };
  try {
    const rows = await prisma.copyTemplate.findMany({ orderBy: { name: "asc" } });
    return {
      ok: true,
      templates: rows.map((t) => ({
        id: t.id,
        name: t.name,
        body: t.body,
        hashtags: t.hashtags,
      })),
    };
  } catch (error) {
    console.error("[admin/marketing] template list failed:", error);
    return { ok: false, error: "No se pudo listar las plantillas" };
  }
}
