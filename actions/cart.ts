"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getPhotoForColor } from "@/lib/colors";
import { ProductType } from "@/types";
import { num } from "@/lib/money";

type CartProductType = ProductType & { quantity: number; cartId: string };

export async function toggleCartProduct(userId: string | undefined, productId: string) {
  if (!userId || userId === "undefined" || !productId) {
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
  selectedTacoOption?: string,
  quantity: number = 1
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || userId === "undefined" || !productId) {
    return { ok: false, error: "Iniciá sesión para comprar" };
  }

  // No user pre-check: a stale JWT id fails fast at FK creation (P2003) and
  // the caller can prompt a fresh sign-in without an extra query per click.
  try {
    const existingCart = await prisma.cart.findFirst({
      where: {
        userId,
        productId,
        selectedSize: selectedSize || null,
        selectedColor: selectedColor || null,
        selectedTacoOption: selectedTacoOption || null,
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
          selectedTacoOption: selectedTacoOption || null,
        },
      });
    }
  } catch (error) {
    console.error("[addToCartWithDetails] failed:", error);
    return {
      ok: false,
      error: "No pudimos agregar el producto al carrito. Intentá de nuevo.",
    };
  }

  revalidatePath("/");
  return { ok: true };
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

// Updates a single cart row identified by its id. Must key on cartId (not
// userId+productId): the same product can appear several times with different
// size/color/taco, and a findFirst by product would bump a sibling variant.
export async function updateCartQuantity(cartId: string, quantity: number) {
  if (!cartId) throw new Error("Missing cartId");

  // deleteMany/updateMany are no-ops when the row is already gone (e.g. two
  // rapid "-" clicks), so they don't throw P2025.
  if (quantity < 1) {
    await prisma.cart.deleteMany({ where: { id: cartId } });
  } else {
    await prisma.cart.updateMany({
      where: { id: cartId },
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

/** Lightweight total for wholesale previews (no product payload needed). */
export async function getCartTotalQuantity(
  userId: string | undefined
): Promise<number> {
  if (!userId || userId === "undefined") return 0;

  try {
    const result = await prisma.cart.aggregate({
      where: { userId },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
  } catch (error) {
    console.error("Error fetching cart total:", error);
    return 0;
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

    return cartItems.map((item) => {
      const product = { ...item.product, price: num(item.product.price) } as ProductType;
      return {
        ...product,
        // Show the photo of the color the customer picked (orders snapshot
        // this too, so history shows the purchased color).
        photo: getPhotoForColor(product, item.selectedColor),
        quantity: item.quantity,
        selectedSize: item.selectedSize || undefined,
        selectedColor: item.selectedColor || undefined,
        selectedTacoOption: item.selectedTacoOption || undefined,
        cartId: item.id,
      };
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return [];
  }
}