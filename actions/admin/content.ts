"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ensureAdmin } from "@/lib/admin";
import { deleteOrphanBlobs, isManagedBlob } from "@/lib/admin/blob";
import { parseWholesaleTiers, getStoreWholesaleTiers } from "@/lib/store-settings";
import { EDITABLE_INFO_SLUGS } from "@/components/info/InfoFallbacks";
import type { WholesaleTier } from "@/lib/discounts";
import type { AdminActionResult } from "@/types/admin";
import type { Prisma } from "@prisma/client";

const PLACEMENTS = ["home_promo"] as const;

const INFO_FALLBACK_KEYS: string[] = [...EDITABLE_INFO_SLUGS];

function revalidateContentInfo() {
  for (const slug of INFO_FALLBACK_KEYS) {
    revalidatePath(`/info/${slug}`);
  }
}

function revalidateContent() {
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/admin");
  revalidatePath("/admin/contenido");
  revalidatePath("/admin/configuracion");
}

interface BannerInput {
  title: string;
  subtitle: string | null;
  imageUrl: string;
  href: string | null;
  placement: string;
  active: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
}

function validateBannerUrl(url: string): boolean {
  if (url.startsWith("/")) {
    // Local static asset (e.g. /assets/...); still must look like a path.
    return /^\/[A-Za-z0-9\-._~\/]+$/.test(url) && !url.includes("..");
  }
  return /^https?:\/\//.test(url);
}

function validateBannerInput(
  input: BannerInput
): { ok: boolean; error?: string } {
  const title = (input.title ?? "").trim();
  if (!title || title.length > 80) {
    return { ok: false, error: "El título es obligatorio (máx. 80)" };
  }
  const imageUrl = (input.imageUrl ?? "").trim();
  if (!imageUrl || !validateBannerUrl(imageUrl)) {
    return { ok: false, error: "Subí una imagen o poné una URL válida" };
  }
  const href = (input.href ?? "").trim();
  if (href && !validateBannerUrl(href)) {
    return { ok: false, error: "El destino debe ser una URL o ruta (/catalog)" };
  }
  if (!PLACEMENTS.includes(input.placement as (typeof PLACEMENTS)[number])) {
    return { ok: false, error: "Ubicación inválida" };
  }
  if (input.startsAt && input.endsAt) {
    const starts = new Date(input.startsAt);
    const ends = new Date(input.endsAt);
    if (
      Number.isNaN(starts.getTime()) ||
      Number.isNaN(ends.getTime()) ||
      ends < starts
    ) {
      return { ok: false, error: "La fecha de fin debe ser posterior al inicio" };
    }
  }
  if (input.sortOrder < 0 || input.sortOrder > 999) {
    return { ok: false, error: "El orden debe estar entre 0 y 999" };
  }
  return { ok: true };
}

function bannerData(input: BannerInput) {
  const starts = input.startsAt ? new Date(input.startsAt) : null;
  const ends = input.endsAt ? new Date(input.endsAt) : null;
  return {
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    imageUrl: input.imageUrl.trim(),
    href: input.href?.trim() || null,
    placement: input.placement,
    active: input.active,
    sortOrder: Math.floor(input.sortOrder),
    startsAt: starts && !Number.isNaN(starts.getTime()) ? starts : null,
    endsAt: ends && !Number.isNaN(ends.getTime()) ? ends : null,
  };
}

export async function createBannerAction(
  input: BannerInput
): Promise<AdminActionResult & { bannerId?: string }> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const check = validateBannerInput(input);
  if (!check.ok) return check as AdminActionResult;

  try {
    const banner = await prisma.banner.create({ data: bannerData(input) });
    revalidateContent();
    return { ok: true, bannerId: banner.id };
  } catch (error) {
    console.error("[admin/banners] create failed:", error);
    return { ok: false, error: "No se pudo crear el banner" };
  }
}

export async function updateBannerAction(
  bannerId: string,
  input: BannerInput
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const existing = await prisma.banner.findUnique({
    where: { id: bannerId },
    select: { imageUrl: true },
  });
  if (!existing) return { ok: false, error: "Banner no encontrado" };

  const check = validateBannerInput(input);
  if (!check.ok) return check as AdminActionResult;

  try {
    await prisma.banner.update({
      where: { id: bannerId },
      data: bannerData(input),
    });
  } catch (error) {
    console.error("[admin/banners] update failed:", error);
    return { ok: false, error: "No se pudo actualizar el banner" };
  }

  if (isManagedBlob(existing.imageUrl) && existing.imageUrl !== input.imageUrl.trim()) {
    await deleteOrphanBlobs(null, [existing.imageUrl]);
  }

  revalidateContent();
  return { ok: true };
}

export async function toggleBannerActiveAction(
  bannerId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const banner = await prisma.banner.findUnique({
    where: { id: bannerId },
    select: { active: true },
  });
  if (!banner) return { ok: false, error: "Banner no encontrado" };

  try {
    await prisma.banner.update({
      where: { id: bannerId },
      data: { active: !banner.active },
    });
  } catch (error) {
    console.error("[admin/banners] toggle failed:", error);
    return { ok: false, error: "No se pudo actualizar el banner" };
  }

  revalidateContent();
  return { ok: true };
}

export async function deleteBannerAction(
  bannerId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const banner = await prisma.banner.findUnique({
    where: { id: bannerId },
    select: { imageUrl: true },
  });
  if (!banner) return { ok: false, error: "Banner no encontrado" };

  try {
    await prisma.banner.delete({ where: { id: bannerId } });
  } catch (error) {
    console.error("[admin/banners] delete failed:", error);
    return { ok: false, error: "No se pudo eliminar el banner" };
  }

  if (isManagedBlob(banner.imageUrl)) {
    await deleteOrphanBlobs(null, [banner.imageUrl]);
  }

  revalidateContent();
  return { ok: true };
}

/**
 * Reorder inside a placement with neighbor swaps. Top-level is index 0.
 */
export async function moveBannerAction(
  bannerId: string,
  direction: "up" | "down"
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const banner = await prisma.banner.findUnique({
    where: { id: bannerId },
    select: { placement: true, sortOrder: true },
  });
  if (!banner) return { ok: false, error: "Banner no encontrado" };

  const ordered = await prisma.banner.findMany({
    where: { placement: banner.placement },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  const index = ordered.findIndex((item) => item.id === bannerId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= ordered.length) {
    return { ok: true };
  }

  const swapped = [...ordered];
  swapped[index] = ordered[target];
  swapped[target] = ordered[index];

  const stamp = swapped.map((item, position) => ({
    id: item.id,
    sortOrder: position * 10,
  }));

  try {
    await prisma.$transaction(
      stamp.map((item) =>
        prisma.banner.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
  } catch (error) {
    console.error("[admin/banners] move failed:", error);
    return { ok: false, error: "No se pudo reordenar el banner" };
  }

  revalidateContent();
  return { ok: true };
}

export interface StoreSettingsInput {
  storeName: string;
  contactEmail: string | null;
  whatsapp: string | null;
  instagram: string | null;
  tiktok: string | null;
  announcement: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroCtaLabel: string | null;
  heroCtaHref: string | null;
}

export async function saveStoreSettingsAction(
  input: StoreSettingsInput
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const storeName = (input.storeName ?? "").trim();
  if (!storeName || storeName.length > 60) {
    return { ok: false, error: "Ingresá el nombre de la tienda (máx. 60)" };
  }

  const cleaned = {
    storeName,
    contactEmail: input.contactEmail?.trim() || null,
    whatsapp: input.whatsapp?.trim() || null,
    instagram: input.instagram?.trim() || null,
    tiktok: input.tiktok?.trim() || null,
    announcement: input.announcement?.trim() || null,
    heroTitle: input.heroTitle?.trim() || null,
    heroSubtitle: input.heroSubtitle?.trim() || null,
    heroCtaLabel: input.heroCtaLabel?.trim() || null,
    heroCtaHref: input.heroCtaHref?.trim() || null,
  };

  try {
    await prisma.storeSettings.upsert({
      where: { id: "default" },
      update: cleaned,
      create: { id: "default", ...cleaned },
    });
  } catch (error) {
    console.error("[admin/settings] save failed:", error);
    return { ok: false, error: "No se pudo guardar la configuración" };
  }

  revalidateContent();
  return { ok: true };
}

/** Manual storefront cache flush (same paths the content actions use). */
export async function revalidateStorefrontAction(): Promise<{
  ok: boolean;
  error?: string;
  paths?: string[];
}> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const paths = ["/", "/catalog"];
  for (const path of paths) {
    revalidatePath(path);
  }

  return { ok: true, paths };
}

/** Current volume-discount tiers (StoreSettings or defaults). */
export async function getWholesaleTiersAction(): Promise<WholesaleTier[]> {
  return getStoreWholesaleTiers();
}

export async function saveWholesaleTiersAction(
  input: unknown
): Promise<{ ok: boolean; error?: string }> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const parsed = parseWholesaleTiers(input);
  if (!parsed.ok || !parsed.tiers) {
    return { ok: false, error: parsed.error };
  }

  try {
    await prisma.storeSettings.upsert({
      where: { id: "default" },
      update: { wholesaleTiers: parsed.tiers as unknown as Prisma.InputJsonValue },
      create: {
        id: "default",
        wholesaleTiers: parsed.tiers as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("[admin/settings] tiers save failed:", error);
    return { ok: false, error: "No se pudieron guardar los tramos" };
  }

  revalidateContent();
  revalidateContentInfo();
  return { ok: true };
}

// --- Info pages (admin-editable content with hardcoded fallbacks) -----------

interface InfoPageInput {
  slug: string;
  title: string;
  description: string | null;
  content: string;
}

export async function saveInfoPageAction(
  input: InfoPageInput
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const slug = (input.slug ?? "").trim();
  const title = (input.title ?? "").trim();
  const content = (input.content ?? "").trim();

  if (!slug || !INFO_FALLBACK_KEYS.includes(slug)) {
    return { ok: false, error: "Página inválida" };
  }
  if (!title || title.length > 80) {
    return { ok: false, error: "Ingresá el título de la página (máx. 80)" };
  }
  if (!content) {
    return {
      ok: false,
      error: "Escribí el contenido (o borrá la página para restaurar el original)",
    };
  }
  if (content.length > 40000) {
    return { ok: false, error: "El contenido es demasiado largo" };
  }

  try {
    await prisma.infoPage.upsert({
      where: { slug },
      update: {
        title,
        description: input.description?.trim() || null,
        content,
      },
      create: {
        slug,
        title,
        description: input.description?.trim() || null,
        content,
      },
    });
  } catch (error) {
    console.error("[admin/content] info save failed:", error);
    return { ok: false, error: "No se pudo guardar la página" };
  }

  revalidateContentInfo();
  return { ok: true };
}

export async function deleteInfoPageAction(
  slug: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  try {
    await prisma.infoPage.deleteMany({ where: { slug } });
  } catch (error) {
    console.error("[admin/content] info delete failed:", error);
    return { ok: false, error: "No se pudo restaurar la página" };
  }

  revalidateContentInfo();
  return { ok: true };
}
