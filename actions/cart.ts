"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ProductType } from "@/types";

type CartProductType = ProductType & { quantity: number; cartId: string };

export async function toggleCartProduct(userId: string | undefined, productId: string) {
  if (!userId || userId === "undefined" || !productId) {
    return;
  }

  try {
    const userExists = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { id: true }
    });
    
    if (!userExists) {
      console.error("[toggleCartProduct] User not found:", userId);
      return;
    }
  } catch (error) {
    console.error("[toggleCartProduct] Error checking user:", error);
    return;
  }

  try {
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
          selectedSize: null,
          selectedColor: null,
        },
      });
    }
  } catch (error) {
    console.error("[toggleCartProduct] Error creating cart:", error);
    throw error;
  }

  revalidatePath("/");
}

export async function addToCartWithDetails(
  userId: string | undefined,
  productId: string,
  selectedSize?: string,
  selectedColor?: string,
  quantity: number = 1
) {
  if (!userId || userId === "undefined" || !productId) {
    return;
  }

  const existingCart = await prisma.cart.findFirst({
    where: { 
      userId, 
      productId,
      selectedSize: selectedSize || null,
      selectedColor: selectedColor || null,
    },
  });

  if (existingCart) {
    await prisma.cart.update({
      where: { id: existingCart.id },
      data: {
        quantity: existingCart.quantity + quantity,
      },
    });
  } else {
    await prisma.cart.create({
      data: {
        userId,
        productId,
        quantity,
        selectedSize: selectedSize || null,
        selectedColor: selectedColor || null,
      },
    });
  }

  revalidatePath("/");
}

export async function removeFromCartById(cartId: string) {
  try {
    await prisma.cart.delete({
      where: { id: cartId },
    });
    revalidatePath("/");
    revalidatePath("/cart");
  } catch (error) {
    console.error("Error removing from cart:", error);
    throw error;
  }
}

export async function updateCartQuantity(
  userId: string | undefined,
  productId: string,
  quantity: number
) {
  if (!userId || userId === "undefined") {
    return;
  }
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

export async function getCartIds(userId: string | undefined) {
  if (!userId || userId === "undefined") return [];

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
  userId: string | undefined
): Promise<CartProductType[]> {
  if (!userId || userId === "undefined") return [];

  try {
    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: { product: true },
    });

    return cartItems.map((item) => ({
      ...(item.product as ProductType),
      quantity: item.quantity,
      selectedSize: item.selectedSize || undefined,
      selectedColor: item.selectedColor || undefined,
      cartId: item.id,
    }));
  } catch (error) {
    console.error("Error fetching cart:", error);
    return [];
  }
}