import prisma from "@/lib/prisma";

/**
 * Slugify a product name for URLs: accents folded, lowercase, alnum + dashes.
 * Pure helper shared by the admin product actions.
 */
export function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base;
}

/**
 * Generate a unique slug for a product name, appending `-2`, `-3`, ... when
 * needed. excludeId lets updates keep their own slug.
 */
export async function uniqueProductSlug(
  name: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(name) || "sandalia";
  let candidate = base;
  let suffix = 1;

  for (;;) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}
