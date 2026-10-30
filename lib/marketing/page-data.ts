import prisma from "@/lib/prisma";
import {
  toMarketingProductOption,
  type RowInput,
} from "@/lib/marketing/product-option";
import { formatAdminDate } from "@/lib/admin/format";
import type {
  MarketingAssetRow,
  MarketingSettingsState,
  MarketingTemplateRow,
  MarketingProductOption,
} from "@/types/admin";

/**
 * Shared data loaders for the marketing composer pages (nuevo / [id]).
 * All of it is read-only page data, never a secret.
 */

export interface ComposerPageData {
  products: MarketingProductOption[];
  templates: MarketingTemplateRow[];
  assets: { id: string; url: string; tag: string | null }[];
  campaigns: string[];
  settings: MarketingSettingsState;
}

export async function loadComposerData(): Promise<ComposerPageData> {
  const [productRows, templates, assets, settings, campaignRows] = await Promise.all([
    prisma.product.findMany({
      where: { archivedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 50,
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
    }),
    prisma.copyTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.socialAsset.findMany({
      orderBy: { createdAt: "desc" },
      take: 120,
      select: { id: true, url: true, tag: true },
    }),
    prisma.marketingSettings.findUnique({ where: { id: "default" } }),
    prisma.socialPost.findMany({
      where: { campaign: { not: null } },
      select: { campaign: true },
      distinct: ["campaign"],
    }),
  ]);

  return {
    products: productRows.map((row) => toMarketingProductOption(row as RowInput)),
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      body: t.body,
      hashtags: t.hashtags,
      updatedAtText: formatAdminDate(t.updatedAt),
    })),
    assets,
    campaigns: campaignRows.map((row) => row.campaign ?? ""),
    settings: {
      brandVoice: settings?.brandVoice ?? null,
      defaultHashtags: settings?.defaultHashtags ?? [],
      instagramHandle: settings?.instagramHandle ?? null,
      whatsappPhone: settings?.whatsappPhone ?? null,
    },
  };
}

/** Marketing asset rows with product names, for the library grid. */
export async function loadAssetRows(): Promise<MarketingAssetRow[]> {
  const rows = await prisma.socialAsset.findMany({
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    url: row.url,
    productId: row.productId,
    productName: row.product?.name ?? null,
    tag: row.tag,
    createdAtText: formatAdminDate(row.createdAt),
  }));
}

/** Flattened products for the bulk composer (masa page + embedded panel). */
export async function loadBulkProducts() {
  const productRows = await prisma.product.findMany({
    where: { archivedAt: null },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: 400,
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
  return productRows.map((row) => toMarketingProductOption(row as RowInput));
}
