"use server";
import { cache as reactCache } from "react";
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ProductType } from "@/types";
import { num } from "@/lib/money";

type ProductRow = Prisma.ProductGetPayload<Record<string, never>>;

/** Prisma row -> storefront type (prices become plain numbers). */
function toProductType(product: ProductRow | null): ProductType | null {
  if (!product) return null;
  return { ...product, price: num(product.price) };
}

function toProductTypeList(products: ProductRow[]): ProductType[] {
  return products.map((p) => ({ ...p, price: num(p.price) }));
}

// generateMetadata and the page component both resolve the same product in
// one request: React.cache dedupes the lookup to a single query.
export const getProduct = reactCache(
  async (idOrSlug: string): Promise<ProductType | null> => {
    if (!idOrSlug) {
      console.error("Error fetching product: Missing id");
      return null;
    }
    // Products are addressed by slug in URLs, but old links (and admin
    // references) still use the cuid: resolve either in one query.
    const product = await prisma.product.findFirst({
      where: {
        available: true,
        archivedAt: null,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
    });
    return toProductType(product);
  }
);

interface RelatedEntry {
  product: ProductType;
  sameCategory: boolean;
}

/** Same category first, then the rest; fetched straight from the DB. */
async function getRelatedProductsUncached(
  id: string,
  category: string
): Promise<RelatedEntry[]> {
  try {
    const related = await prisma.product.findMany({
      where: { available: true, archivedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        photo: true,
        price: true,
        category: true,
        code: true,
        description: true,
        stock: true,
        available: true,
        sizes: true,
        colors: true,
        photos: true,
        tacoOptions: true,
      },
      take: 60,
    });

    return related
      .filter((p) => p.id !== id)
      .map((p) => ({
        product: {
          ...p,
          price: num(p.price),
          photos: p.photos as ProductType["photos"],
        },
        sameCategory: p.category === category,
      }));
  } catch (error) {
    console.error("Error fetching related products:", error);
    return [];
  }
}

// The related list only changes when the admin edits the catalog, which
// already revalidatePath("/") — a short TTL keeps it fresh for free.
export const getRelatedProducts = unstable_cache(
  getRelatedProductsUncached,
  ["related-products"],
  { revalidate: 300 }
);

export async function getProducts(): Promise<ProductType[]> {
  try {
    const products = await prisma.product.findMany({
      where: { available: true, archivedAt: null },
    });
    return toProductTypeList(products).sort((a, b) =>
      a.slug.localeCompare(b.slug)
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export async function getAllProducts(): Promise<ProductType[]> {
  try {
    return toProductTypeList(await prisma.product.findMany());
  } catch (error) {
    console.error("Error fetching all products:", error);
    return [];
  }
}
