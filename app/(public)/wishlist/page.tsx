import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { num } from "@/lib/money";
import { interleaveByColor, getPriceBounds } from "@/lib/catalog";
import { getStoreWholesaleTiers } from "@/lib/store-settings";
import WishlistClient from "./WishlistClient";

export const metadata: Metadata = {
  title: "Mis favoritos",
  description: "Tus sandalias artesanales guardadas para más tarde.",
  robots: { index: false, follow: true },
};

export default async function WishlistPage() {
  const session = await getServerSession(authOptions);
  const tiers = await getStoreWholesaleTiers();

  let wishlistProducts: Awaited<ReturnType<typeof prisma.product.findMany>> = [];
  let initialCartIds: string[] = [];

  if (session?.user?.id) {
    const userId = session.user.id as string;
    const [wishlistRows, cartRows] = await Promise.all([
      prisma.wishList.findMany({
        where: { userId },
        select: { productId: true },
      }),
      prisma.cart.findMany({
        where: { userId },
        select: { productId: true },
      }),
    ]);
    initialCartIds = cartRows.map((c) => c.productId);

    if (wishlistRows.length > 0) {
      wishlistProducts = await prisma.product.findMany({
        where: {
          id: { in: wishlistRows.map((w) => w.productId) },
          available: true,
          archivedAt: null,
        },
      });
    }
  }

  const products = interleaveByColor(wishlistProducts).map((p) => ({
    ...p,
    price: num(p.price),
    photos: (p.photos ?? undefined) as never,
  }));

  return (
    <WishlistClient
      initialProducts={products}
      initialCartIds={initialCartIds}
      tiers={tiers}
      hasSession={Boolean(session?.user?.id)}
      priceBounds={getPriceBounds(products)}
    />
  );
}
