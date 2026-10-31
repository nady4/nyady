import { upload } from "@vercel/blob/client";
import { getBlobUploadStatusAction } from "@/actions/admin/uploads";

/**
 * Shared admin image upload helper (browser side).
 *
 * - Verifies the Blob client-upload token is configured BEFORE attempting
 *   the upload, so the admin sees an actionable message instead of the
 *   SDK's opaque "Failed to retrieve the client token".
 * - Sanitizes the file name (accents/spaces/special chars) so the Blob
 *   pathname is always valid.
 */

export function sanitizeFileName(name: string): string {
  const extension = (name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".jpg").toLowerCase();
  const base = name.replace(/\.[a-z0-9]+$/i, "");
  const clean = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  return `${clean || "imagen"}${extension}`;
}

export async function uploadAdminImage(
  file: File,
  pathnamePrefix: string
): Promise<{ url: string }> {
  const status = await getBlobUploadStatusAction();
  if (!status.ok) {
    throw new Error(status.error ?? "Las subidas no están disponibles");
  }
  if (status.ready === false) {
    throw new Error(
      status.error ?? "Las subidas no están disponibles en este entorno"
    );
  }

  const blob = await upload(`${pathnamePrefix}${sanitizeFileName(file.name)}`, file, {
    access: "public",
    handleUploadUrl: "/api/admin/upload",
  });
  return { url: blob.url };
}
