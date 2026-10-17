export const COLOR_ALIASES: Record<string, string[]> = {
  Nude: ["nude", "beige"],
  Plata: ["plata", "blanco", "plateado", "silver"],
  "Rosa claro": ["rosa_claro", "beige", "rosado", "rosa"],
  Blanco: ["blanco", "beige", "white"],
  "Animal Print": ["animal_print", "caspeado", "animal"],
  Caspeado: ["caspeado", "animal_print"],
};

export function colorSlug(color: string): string {
  return color.toLowerCase().replace(/\s+/g, "_");
}

export function findAliasForColor(
  targetColor: string,
  availableSlugs: Set<string>
): string | null {
  const candidates = [colorSlug(targetColor), ...(COLOR_ALIASES[targetColor] ?? [])];
  for (const c of candidates) {
    if (availableSlugs.has(c)) return c;
  }
  return null;
}
