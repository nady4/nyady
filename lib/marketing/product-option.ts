/**
 * Product row -> composer option mapping shared by the marketing pages and
 * the product-search server action. `photos` is the per-color JSON map of
 * image URLs; the option flattens cover + buckets into photoUrls for quick
 * reuse in the composer's media picker.
 */
export interface RowInput {
  id: string;
  name: string;
  slug: string;
  price: { toNumber(): number } | number;
  photo: string;
  photos: unknown;
  category: string;
  colors: string[];
  sizes: string[];
  description: string | null;
}

export function toMarketingProductOption(row: RowInput) {
  const photoUrls = new Set<string>();
  if (row.photo) photoUrls.add(row.photo);
  if (row.photos && typeof row.photos === "object" && !Array.isArray(row.photos)) {
    for (const list of Object.values(row.photos as Record<string, unknown>)) {
      if (Array.isArray(list)) {
        for (const url of list) {
          if (typeof url === "string" && url) photoUrls.add(url);
        }
      }
    }
  }
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: typeof row.price === "number" ? row.price : row.price.toNumber(),
    category: row.category,
    photo: row.photo,
    photoUrls: [...photoUrls],
    colors: row.colors ?? [],
    sizes: row.sizes ?? [],
    description: row.description,
  };
}
