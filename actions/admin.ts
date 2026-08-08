"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { markOrderReady } from "@/actions/orders";

export interface AdminActionResult {
  ok: boolean;
  error?: string;
}

function requireAdmin(): Promise<boolean> {
  return isAdmin();
}function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePhotos(value: string): Record<string, string[]> | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string[]>;
    }
  } catch {
    // fall through
  }
  return undefined;
}

export async function createProductAction(
  formData: FormData
): Promise<AdminActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "No autorizado" };
  }

  const name = String(formData.get("name") || "").trim();
  const photo = String(formData.get("photo") || "").trim();
  const price = Number(formData.get("price"));
  const category = String(formData.get("category") || "").trim();

  if (!name || !photo || !price || !category) {
    return { ok: false, error: "Completá nombre, foto, precio y categoría" };
  }

  await prisma.product.create({
    data: {
      name,
      photo,
      price,
      category,
      stock: 0, // hecho a pedido, sin stock
      code: String(formData.get("code") || "").trim() || null,
      description:
        String(formData.get("description") || "").trim() || null,
      sizes: parseList(String(formData.get("sizes") || "")),
      colors: parseList(String(formData.get("colors") || "")),
      tacoOptions: parseList(String(formData.get("tacoOptions") || "")),
      photos: parsePhotos(String(formData.get("photos") || "")) ?? undefined,
      available: formData.get("available") === "on",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/catalog");
  revalidatePath("/");
  return { ok: true };
}

export async function updateProductAction(
  productId: string,
  formData: FormData
): Promise<AdminActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "No autorizado" };
  }

  const name = String(formData.get("name") || "").trim();
  const photo = String(formData.get("photo") || "").trim();
  const price = Number(formData.get("price"));
  const category = String(formData.get("category") || "").trim();

  if (!name || !photo || !price || !category) {
    return { ok: false, error: "Completá nombre, foto, precio y categoría" };
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      name,
      photo,
      price,
      category,
      code: String(formData.get("code") || "").trim() || null,
      description:
        String(formData.get("description") || "").trim() || null,
      sizes: parseList(String(formData.get("sizes") || "")),
      colors: parseList(String(formData.get("colors") || "")),
      tacoOptions: parseList(String(formData.get("tacoOptions") || "")),
      photos: parsePhotos(String(formData.get("photos") || "")) ?? undefined,
      available: formData.get("available") === "on",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/catalog");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleAvailabilityAction(
  productId: string
): Promise<AdminActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "No autorizado" };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { available: true },
  });

  if (!product) return { ok: false, error: "Producto no encontrado" };

  await prisma.product.update({
    where: { id: productId },
    data: { available: !product.available },
  });

  revalidatePath("/admin");
  revalidatePath("/catalog");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteProductAction(
  productId: string
): Promise<AdminActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "No autorizado" };
  }

  await prisma.cart.deleteMany({ where: { productId } });
  await prisma.wishList.deleteMany({ where: { productId } });
  await prisma.orderItem.deleteMany({ where: { productId } });
  await prisma.product.delete({ where: { id: productId } });

  revalidatePath("/admin");
  revalidatePath("/catalog");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Admin-facing wrapper around markOrderReady: moves an approved order from
 * "En Preparación" to Zipnova by creating the shipment (POST /shipments).
 * The buyer-facing /orders page only reads tracking; shipment creation is
 * seller-only, gated here by the admin session cookie.
 */
export async function shipOrderAction(
  orderId: string
): Promise<AdminActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "No autorizado" };
  }

  const result = await markOrderReady(orderId);

  revalidatePath("/admin/pedidos");
  return result;
}
