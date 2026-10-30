import type { CSSProperties } from "react";
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
 * Animal print (leopard-style) tile: warm tan base with irregular dark
 * rosettes and plain dots, so the swatch reads as a print instead of a flat
 * color. Rendered through a data URI so it works on both client and server
 * components (and in `backgroundImage`).
 */
const ANIMAL_PRINT_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'>
<rect width='40' height='40' fill='#c9a66b'/>
<ellipse cx='7' cy='8' rx='4.5' ry='3.6' fill='none' stroke='#54351a' stroke-width='2.4'/>
<ellipse cx='7' cy='8' rx='2.2' ry='1.7' fill='#2f1d09'/>
<ellipse cx='21' cy='5' rx='3.6' ry='3' fill='none' stroke='#54351a' stroke-width='2.2'/>
<ellipse cx='35' cy='8' rx='2.6' ry='2.2' fill='#2f1d09'/>
<ellipse cx='15' cy='17' rx='5' ry='4.2' fill='none' stroke='#54351a' stroke-width='2.4'/>
<ellipse cx='15' cy='17' rx='2.4' ry='1.9' fill='#2f1d09'/>
<ellipse cx='29' cy='16' rx='3.8' ry='3.2' fill='none' stroke='#54351a' stroke-width='2.2'/>
<ellipse cx='29' cy='16' rx='1.8' ry='1.5' fill='#2f1d09'/>
<ellipse cx='4' cy='25' rx='3.2' ry='2.7' fill='#2f1d09'/>
<ellipse cx='18' cy='29' rx='4.2' ry='3.5' fill='none' stroke='#54351a' stroke-width='2.4'/>
<ellipse cx='18' cy='29' rx='2' ry='1.6' fill='#2f1d09'/>
<ellipse cx='33' cy='28' rx='3.4' ry='2.9' fill='none' stroke='#54351a' stroke-width='2.2'/>
<ellipse cx='11' cy='38' rx='2.8' ry='2.3' fill='#2f1d09'/>
<ellipse cx='29' cy='37.5' rx='4' ry='2.2' fill='none' stroke='#54351a' stroke-width='2.4'/>
<ellipse cx='39' cy='36' rx='2.2' ry='1.9' fill='#2f1d09'/>
<ellipse cx='39' cy='20' rx='2' ry='1.7' fill='#2f1d09'/>
<ellipse cx='0.5' cy='2.5' rx='2.2' ry='1.9' fill='#2f1d09'/>
</svg>`;

const ANIMAL_PRINT_PATTERN = `url("data:image/svg+xml,${encodeURIComponent(
  ANIMAL_PRINT_SVG.replace(/\n/g, " ")
)}")`;

/**
 * Whether a color name is a print (patchwork) rather than a flat hue:
 * "Animal Print" and its alias "Caspeado".
 */
export function isAnimalPrintColor(color: string): boolean {
  return /animal print|caspeado/i.test(color);
}

/**
 * Inline style for a color swatch. Flat colors get a solid background;
 * print colors ("Animal Print", "Caspeado") layer a repeating SVG pattern
 * over the base hex. The 50% tile makes the print scale with the swatch.
 */
export function getColorSwatchStyle(color: string): CSSProperties {
  const backgroundColor = getColorHex(color);
  if (isAnimalPrintColor(color)) {
    return {
      backgroundColor,
      backgroundImage: ANIMAL_PRINT_PATTERN,
      backgroundSize: "50% 50%",
    };
  }
  return { backgroundColor };
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
