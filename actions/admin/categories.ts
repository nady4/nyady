"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ensureAdmin } from "@/lib/admin";
import type { AdminActionResult } from "@/types/admin";

// Product.category is a free-text string (no Category table in v1), so the
// categories section operates directly over the distinct values used by
// products. Renaming/merging rewrites every product (active and archived) in
// one transaction so storefront filters stay consistent.

function revalidateCategories() {
  revalidatePath("/admin/categorias");
  revalidatePath("/admin");
  revalidatePath("/admin/productos");
  revalidatePath("/catalog");
  revalidatePath("/");
}

async function countProducts(category: string): Promise<number> {
  return prisma.product.count({ where: { category } });
}

export async function renameCategoryAction(
  from: string,
  to: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const source = from.trim();
  const target = to.trim();

  if (!source || !target) {
    return { ok: false, error: "Elegí una categoría y un nombre nuevo" };
  }
  if (source === target) {
    return { ok: false, error: "El nombre nuevo es igual al actual" };
  }
  if (target.length > 60) {
    return { ok: false, error: "El nombre no puede superar 60 caracteres" };
  }

  const sourceCount = await countProducts(source);
  if (sourceCount === 0) {
    return { ok: false, error: "La categoría ya no existe" };
  }

  try {
    await prisma.$transaction([
      prisma.product.updateMany({
        where: { category: source },
        data: { category: target },
      }),
    ]);
  } catch (error) {
    console.error("[admin/categories] rename failed:", error);
    return { ok: false, error: "No se pudo renombrar la categoría" };
  }

  revalidateCategories();
  return { ok: true };
}

export async function mergeCategoryAction(
  from: string,
  into: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const source = from.trim();
  const target = into.trim();

  if (!source || !target) {
    return { ok: false, error: "Elegí la categoría a fusionar y el destino" };
  }
  if (source === target) {
    return { ok: false, error: "Elegí una categoría destino distinta" };
  }

  const sourceCount = await countProducts(source);
  if (sourceCount === 0) {
    return { ok: false, error: "La categoría ya no existe" };
  }

  try {
    await prisma.product.updateMany({
      where: { category: source },
      data: { category: target },
    });
  } catch (error) {
    console.error("[admin/categories] merge failed:", error);
    return { ok: false, error: "No se pudo fusionar la categoría" };
  }

  revalidateCategories();
  return { ok: true };
}

// Deleting is only possible for categories without products: since a
// category is just the string on its products, an empty one already vanished
// from the list — this action exists for explicit confirmation paths only.
export async function deleteCategoryAction(
  category: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const count = await countProducts(category.trim());
  if (count > 0) {
    return {
      ok: false,
      error: "La categoría tiene productos: primero renombralos o fusionalos",
    };
  }

  revalidateCategories();
  return { ok: true };
}
