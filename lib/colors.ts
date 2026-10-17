import type { ProductType } from "@/types";

// Single source of truth for product color → hex mapping. Previously this map
// was duplicated across ColorSelector, Filters, ProductCard and the seed, which
// let them drift (Caspeado was #333333 in one place and #c4a35a in others, and
// "Nevado" existed only in the seed so it rendered as the fallback gray).
//
// No "use server" directive and no Prisma imports, so this is safe to import
// from both client and server components.

export const COLOR_HEX: Record<string, string> = {
  Negro: "#1a1a1a",
  Marrón: "#8b4513",
  Gris: "#6b7280",
  Beige: "#f5f5dc",
  "Rosa claro": "#ffb6c1",
  Fucsia: "#ff00ff",
  Bordó: "#800020",
  Caspeado: "#c4a35a",
  Camel: "#c19a6b",
  Violeta: "#8b00ff",
  Nevado: "#e8e8e8",
  Nude: "#d4a373",
  Blanco: "#f5f5f5",
  "Animal Print": "#8b6f3a",
  Plata: "#c0c0c0"
};

/**
 * Whether a color name refers to black ("Negro", "Negro mate", ...).
 * Case-insensitive.
 */
export function isBlackColor(color: string): boolean {
  return color.trim().toLowerCase().startsWith("negro");
}

/**
 * Resolve a color name to a hex string. If the input is already a hex value
 * it's returned as-is; unknown names fall back to a neutral gray so the swatch
 * still renders (rather than transparent) and the bug is visually obvious.
 * Case-insensitive on the name lookup.
 */
export function getColorHex(color: string): string {
  if (color.startsWith("#")) return color;
  const key = Object.keys(COLOR_HEX).find(
    (k) => k.toLowerCase() === color.toLowerCase()
  );
  return COLOR_HEX[key || ""] || "#cccccc";
}

/**
 * First photo for a specific color of a product (the one shown when that
 * color is selected on the product page). Falls back to the product's
 * default photo when no color is given or the color has no photos.
 * Color lookup is case-insensitive.
 */
export function getPhotoForColor(
  product: Pick<ProductType, "photo" | "photos">,
  color?: string | null
): string {
  if (!color) return product.photo;
  const { photos } = product;
  if (!photos || typeof photos !== "object" || Array.isArray(photos)) {
    return product.photo;
  }
  const photoMap = photos as Record<string, string[]>;
  const key = Object.keys(photoMap).find(
    (k) => k.trim().toLowerCase() === color.trim().toLowerCase()
  );
  const list = key ? photoMap[key] : undefined;
  if (!Array.isArray(list) || list.length === 0) return product.photo;
  return list[0];
}
