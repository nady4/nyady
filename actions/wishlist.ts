"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ProductType } from "@/types";

export async function toggleWishlistProduct(userId: string, productId: string) {
  if (!userId) throw new Error("Missing userId");
  if (!productId) throw new Error("Missing productId");

  const existingWish = await prisma.wishList.findFirst({
    where: { userId, productId },
  });

  if (existingWish) {
    await prisma.wishList.delete({ where: { id: existingWish.id } });
  } else {
    await prisma.wishList.create({
      data: {
        userId,
        productId,
      },
    });
  }

  revalidatePath("/");
}

export async function getWishlistIds(userId: string) {
  if (!userId) throw new Error("Missing userId");

  try {
    const wishlistItems = await prisma.wishList.findMany({
      where: { userId },
      select: { productId: true },
    });

    return wishlistItems.map((item) => item.productId);
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return [];
  }
}

export async function getWishListProducts(
  userId: string
): Promise<ProductType[]> {
  if (!userId) throw new Error("Missing userId");

  try {
    const wishlistItems = await prisma.wishList.findMany({
      where: { userId },
      select: { productId: true },
    });

    const productIds = wishlistItems.map((item) => item.productId);

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });

    return products as ProductType[];
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return [];
  }
}