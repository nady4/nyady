"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ProductType } from "@/types";

type CartProductType = ProductType & { quantity: number };

export async function toggleCartProduct(userId: string, productId: string) {
  if (!userId) throw new Error("Missing userId");
  if (!productId) throw new Error("Missing productId");

  const existingCart = await prisma.cart.findFirst({
    where: { userId, productId },
  });

  if (existingCart) {
    await prisma.cart.delete({ where: { id: existingCart.id } });
  } else {
    await prisma.cart.create({
      data: {
        userId,
        productId,
        quantity: 1,
      },
    });
  }

  revalidatePath("/");
}

export async function updateCartQuantity(
  userId: string,
  productId: string,
  quantity: number
) {
  if (!userId) throw new Error("Missing userId");
  if (!productId) throw new Error("Missing productId");

  const existingCart = await prisma.cart.findFirst({
    where: { userId, productId },
  });

  if (!existingCart) {
    if (quantity < 1) {
      revalidatePath("/");
      return;
    }

    await prisma.cart.create({
      data: {
        userId,
        productId,
        quantity,
      },
    });

    revalidatePath("/");
    return;
  }

  if (quantity < 1) {
    await prisma.cart.delete({ where: { id: existingCart.id } });
  } else {
    await prisma.cart.update({
      where: { id: existingCart.id },
      data: { quantity },
    });
  }

  revalidatePath("/");
}

export async function getCartIds(userId: string) {
  if (!userId) throw new Error("Missing userId");

  try {
    const cartItems = await prisma.cart.findMany({
      where: { userId },
      select: { productId: true },
    });

    return cartItems.map((item) => item.productId);
  } catch (error) {
    console.error("Error fetching cart:", error);
    return [];
  }
}

export async function getCartProducts(
  userId: string
): Promise<CartProductType[]> {
  if (!userId) throw new Error("Missing userId");

  try {
    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: { product: true },
    });

    return cartItems.map((item) => ({
      ...(item.product as ProductType),
      quantity: item.quantity,
    }));
  } catch (error) {
    console.error("Error fetching cart:", error);
    return [];
  }
}