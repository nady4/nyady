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
  Nevado: "#e8e8e8"
};

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
