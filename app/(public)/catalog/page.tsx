import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { num } from "@/lib/money";
import { interleaveByColor, getPriceBounds } from "@/lib/catalog";
import { getStoreWholesaleTiers } from "@/lib/store-settings";
import CatalogClient from "./CatalogClient";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Sandalias Artesanales",
  description:
    "Sandalias, pantuflas y calzado artesanal hecho a mano con selección por talle, color y taco. Envíos a todo Argentina.",
  alternates: {
    canonical: "/catalog",
  },
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  // Only path-relative q values (no injection surprises); the SSR grid is
  // prefiltered so the served HTML already matches the query.
  const rawQuery = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const q = rawQuery
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const [session, products, tiers] = await Promise.all([
    getServerSession(authOptions),
    prisma.product.findMany({
      where: { available: true, archivedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    getStoreWholesaleTiers(),
  ]);

  let sortedProducts = interleaveByColor(products).map((p) => ({
    ...p,
    price: num(p.price), purchasePrice: null,
    photos: (p.photos ?? undefined) as never,
  }));

  if (q) {
    const haystack = (product: {
      name: string;
      description?: string | null;
      code?: string | null;
      category: string;
      colors?: string[];
      sizes?: string[];
    }) =>
      [
        product.name,
        product.description,
        product.code,
        product.category,
        ...(product.colors ?? []),
        ...(product.sizes ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    sortedProducts = sortedProducts.filter(
      (product) => haystack(product).includes(q)
    );
  }

  const categories = [...new Set(sortedProducts.map((p) => p.category))];

  let initialWishlistIds: string[] = [];
  let initialCartIds: string[] = [];
  if (session?.user?.id) {
    const [wishlist, cart] = await Promise.all([
      prisma.wishList.findMany({
        where: { userId: session.user.id as string },
        select: { productId: true },
      }),
      prisma.cart.findMany({
        where: { userId: session.user.id as string },
        select: { productId: true },
      }),
    ]);
    initialWishlistIds = wishlist.map((w) => w.productId);
    initialCartIds = cart.map((c) => c.productId);
  }

  return (
    <CatalogClient
      initialProducts={sortedProducts}
      categories={categories}
      initialWishlistIds={initialWishlistIds}
      initialCartIds={initialCartIds}
      tiers={tiers}
      priceBounds={getPriceBounds(sortedProducts)}
      query={rawQuery}
      // Server knows beforehand: no skeleton flash for a query with 0 hits.
      noResultsQuery={rawQuery && sortedProducts.length === 0 ? rawQuery : ""}
    />
  );
}
