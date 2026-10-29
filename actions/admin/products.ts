"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ensureAdmin } from "@/lib/admin";
import { uniqueProductSlug } from "@/lib/slug";
import { collectProductUrls, deleteOrphanBlobs } from "@/lib/admin/blob";
import { purchasePriceOf } from "@/lib/admin/pricing";
import type {
  AdminActionResult,
  ProductActionKind,
  ProductInput,
} from "@/types/admin";

const MAX_LIST_ITEMS = 40;

function sanitizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_LIST_ITEMS);
}

function sanitizePhotos(value: unknown): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const [key, list] of Object.entries(value as Record<string, unknown>)) {
    const urls = sanitizeList(list);
    if (key.trim() && urls.length > 0) result[key.trim()] = urls;
  }
  return result;
}

function validateProductInput(
  input: ProductInput
): { ok: boolean; error?: string } {
  const name = input.name?.trim() ?? "";
  const photo = input.photo?.trim() ?? "";
  const category = input.category?.trim() ?? "";

  if (!name) return { ok: false, error: "Ingresá el nombre del producto" };
  if (name.length > 120) {
    return { ok: false, error: "El nombre no puede superar 120 caracteres" };
  }
  if (!photo || !/^https?:\/\//.test(photo)) {
    return { ok: false, error: "Agregá al menos una imagen de portada" };
  }
  if (!category) return { ok: false, error: "Ingresá la categoría" };
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return { ok: false, error: "Ingresá un precio mayor a cero" };
  }
  if (!Number.isFinite(input.purchasePrice) || input.purchasePrice < 0) {
    return { ok: false, error: "Ingresá un precio de compra válido" };
  }
  // The cover must belong to the uploaded set (prevents typos pointing to
  // arbitrary hosts through the form).
  const knownUrls = new Set(collectProductUrls(photo, input.photos));
  if (!knownUrls.has(photo)) {
    return { ok: false, error: "La portada debe ser una de las imágenes cargadas" };
  }

  return { ok: true };
}

async function revalidateStorefront() {
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/admin");
  revalidatePath("/admin/productos");
}

export async function createProductAction(
  input: ProductInput
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const check = validateProductInput(input);
  if (!check.ok) return check as AdminActionResult;

  try {
    await prisma.product.create({
      data: {
        name: input.name.trim(),
        slug: await uniqueProductSlug(input.name),
        description: input.description?.trim() || null,
        price: input.price,
        purchasePrice: input.purchasePrice,
        category: input.category.trim(),
        stock: 0, // hecho a pedido: sin stock real
        code: input.code?.trim() || null,
        purchaseName: input.purchaseName?.trim() || null,
        available: input.available,
        sizes: sanitizeList(input.sizes),
        colors: sanitizeList(input.colors),
        tacoOptions: sanitizeList(input.tacoOptions),
        photo: input.photo.trim(),
        photos: sanitizePhotos(input.photos),
      },
    });
  } catch (error) {
    console.error("[admin/products] create failed:", error);
    return { ok: false, error: "No se pudo crear el producto" };
  }

  await revalidateStorefront();
  return { ok: true };
}

export async function updateProductAction(
  productId: string,
  input: ProductInput
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { photo: true, photos: true, slug: true, name: true },
  });
  if (!existing) return { ok: false, error: "Producto no encontrado" };

  const check = validateProductInput(input);
  if (!check.ok) return check as AdminActionResult;

  const nextPhotos = sanitizePhotos(input.photos);

  // Regenerate the URL slug only when the name actually changed, so existing
  // product links keep working while renames keep URLs fresh.
  const shouldRenameSlug = existing.name !== input.name.trim();

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        name: input.name.trim(),
        slug: shouldRenameSlug
          ? await uniqueProductSlug(input.name, productId)
          : existing.slug,
        description: input.description?.trim() || null,
        price: input.price,
        purchasePrice: input.purchasePrice,
        category: input.category.trim(),
        stock: 0, // hecho a pedido: sin stock real
        code: input.code?.trim() || null,
        purchaseName: input.purchaseName?.trim() || null,
        available: input.available,
        sizes: sanitizeList(input.sizes),
        colors: sanitizeList(input.colors),
        tacoOptions: sanitizeList(input.tacoOptions),
        photo: input.photo.trim(),
        photos: nextPhotos,
      },
    });
  } catch (error) {
    console.error("[admin/products] update failed:", error);
    return { ok: false, error: "No se pudo actualizar el producto" };
  }

  // Best-effort cleanup of images removed by this edit.
  const before = new Set(collectProductUrls(existing.photo, existing.photos));
  const after = new Set(collectProductUrls(input.photo, nextPhotos));
  const removed = [...before].filter((url) => !after.has(url));
  await deleteOrphanBlobs(productId, removed);

  await revalidateStorefront();
  return { ok: true };
}

export async function toggleProductAvailabilityAction(
  productId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { available: true, archivedAt: true },
  });
  if (!product) return { ok: false, error: "Producto no encontrado" };
  if (product.archivedAt) {
    return { ok: false, error: "El producto está archivado: restuarlo primero" };
  }

  await prisma.product.update({
    where: { id: productId },
    data: { available: !product.available },
  });

  await revalidateStorefront();
  return { ok: true };
}

/**
 * Soft delete: hides the product from storefront and admin default list.
 * Cart/wishlist rows are removed (nothing else references them for this
 * purpose); orders keep their OrderItem rows pointing at the product so
 * history stays intact.
 */
export async function archiveProductAction(
  productId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  try {
    await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { archivedAt: new Date(), available: false },
      }),
      prisma.cart.deleteMany({ where: { productId } }),
      prisma.wishList.deleteMany({ where: { productId } }),
    ]);
  } catch (error) {
    console.error("[admin/products] archive failed:", error);
    return { ok: false, error: "No se pudo archivar el producto" };
  }

  await revalidateStorefront();
  return { ok: true };
}

export async function restoreProductAction(
  productId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  try {
    await prisma.product.update({
      where: { id: productId },
      data: { archivedAt: null },
    });
  } catch (error) {
    console.error("[admin/products] restore failed:", error);
    return { ok: false, error: "No se pudo restaurar el producto" };
  }

  await revalidateStorefront();
  return { ok: true };
}

/**
 * Permanent delete — only offered for products without orders (no history to
 * break). Cleans carts, wishlists and the uploaded blobs.
 */
export async function deleteProductPermanentlyAction(
  productId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!product) return { ok: false, error: "Producto no encontrado" };
  if (product._count.orderItems > 0) {
    return {
      ok: false,
      error: "El producto tiene pedidos: usá archivar para conservar el historial",
    };
  }

  const urls = collectProductUrls(product.photo, product.photos);

  try {
    await prisma.$transaction([
      prisma.cart.deleteMany({ where: { productId } }),
      prisma.wishList.deleteMany({ where: { productId } }),
      prisma.product.delete({ where: { id: productId } }),
    ]);
  } catch (error) {
    console.error("[admin/products] delete failed:", error);
    return { ok: false, error: "No se pudo eliminar el producto" };
  }

  await deleteOrphanBlobs(null, urls);
  await revalidateStorefront();
  return { ok: true };
}

export async function duplicateProductAction(
  productId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { ok: false, error: "Producto no encontrado" };

  try {
    await prisma.product.create({
      data: {
        name: `${product.name} (copia)`,
        slug: await uniqueProductSlug(`${product.name} (copia)`),
        photo: product.photo,
        price: product.price,
        purchasePrice: purchasePriceOf(product),
        category: product.category,
        stock: product.stock,
        code: null,
        purchaseName: product.purchaseName,
        available: false,
        sizes: [...product.sizes],
        colors: [...product.colors],
        tacoOptions: [...product.tacoOptions],
        photos: (product.photos ?? undefined) as
          | Record<string, string[]>
          | undefined,
        description: product.description,
      },
    });
  } catch (error) {
    console.error("[admin/products] duplicate failed:", error);
    return { ok: false, error: "No se pudo duplicar el producto" };
  }

  await revalidateStorefront();
  return { ok: true };
}

export async function bulkProductAction(
  productIds: string[],
  action: ProductActionKind
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }
  const ids = productIds.filter(Boolean);
  if (ids.length === 0) return { ok: true };

  try {
    if (action === "archive") {
      await prisma.$transaction([
        prisma.product.updateMany({
          where: { id: { in: ids } },
          data: { archivedAt: new Date(), available: false },
        }),
        prisma.cart.deleteMany({ where: { productId: { in: ids } } }),
        prisma.wishList.deleteMany({ where: { productId: { in: ids } } }),
      ]);
    } else {
      await prisma.product.updateMany({
        where: { id: { in: ids }, archivedAt: null },
        data: { available: action === "activate" },
      });
    }
  } catch (error) {
    console.error("[admin/products] bulk failed:", error);
    return { ok: false, error: "No se pudo aplicar la acción" };
  }

  await revalidateStorefront();
  return { ok: true };
}
