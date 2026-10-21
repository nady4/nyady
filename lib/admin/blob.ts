import { del } from "@vercel/blob";
import prisma from "@/lib/prisma";

/**
 * Best-effort cleanup of Vercel Blob images removed by the admin. A blob is
 * only deleted when no other product (photo field or photos JSON) and no
 * banner still references the URL, so a URL pasted into two products is safe.
 */
const BLOB_HOST = ".public.blob.vercel-storage.com";

export function isManagedBlob(url: unknown): url is string {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    url.includes(BLOB_HOST) &&
    (url.includes("/products/") || url.includes("/banners/"))
  );
}

export function collectProductUrls(
  photo: string | null | undefined,
  photos: unknown
): string[] {
  const urls = new Set<string>();
  if (typeof photo === "string" && photo) urls.add(photo);
  if (photos && typeof photos === "object" && !Array.isArray(photos)) {
    for (const list of Object.values(photos as Record<string, unknown>)) {
      if (Array.isArray(list)) {
        for (const url of list) {
          if (typeof url === "string" && url) urls.add(url);
        }
      }
    }
  }
  return [...urls];
}

export async function deleteOrphanBlobs(
  ownerId: string | null,
  removedUrls: string[]
): Promise<void> {
  for (const url of removedUrls) {
    if (!isManagedBlob(url)) continue;

    try {
      const [productPhotoCount, bannerCount, photosUsageRows] = await Promise.all([
        prisma.product.count({
          where: {
            ...(ownerId ? { id: { not: ownerId } } : {}),
            photo: url,
          },
        }),
        prisma.banner.count({ where: { imageUrl: url } }),
        // photos is a JSON column; a parameterized LIKE over its text form
        // catches array usages. URL-encoding means the pattern can only
        // over-match (never delete something still referenced).
        ownerId !== null
          ? prisma.$queryRaw<{ count: number }[]>`
              SELECT COUNT(*)::int AS count
              FROM "Product"
              WHERE "photos"::text LIKE ${"%" + url + "%"}
                AND id <> ${ownerId}`
          : prisma.$queryRaw<{ count: number }[]>`
              SELECT COUNT(*)::int AS count
              FROM "Product"
              WHERE "photos"::text LIKE ${"%" + url + "%"}`,
      ]);

      const photosUsage =
        photosUsageRows[0]?.count != null ? Number(photosUsageRows[0].count) : 0;

      if (productPhotoCount === 0 && bannerCount === 0 && photosUsage === 0) {
        await del(url).catch(() => undefined);
      }
    } catch {
      // Cleanup is best-effort; never block the admin action on it.
    }
  }
}
