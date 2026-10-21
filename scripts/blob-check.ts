/**
 * Verifies the local BLOB_READ_WRITE_TOKEN (scripts/blob:check).
 * Uploads a tiny PNG, re-reads its metadata and deletes it. Exits non-zero
 * when the token is missing or invalid, so it can gate deployments.
 */
import { put, head, del } from "@vercel/blob";

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error(
    "[blob:check] Falta BLOB_READ_WRITE_TOKEN en el entorno. Copialo desde Vercel (Project → Settings → Environment Variables) al .env local."
  );
  process.exit(1);
}

// 1x1 transparent PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYGD4DwABBAEAX9818QAAAABJRU5ErkJggg==",
  "base64"
);

const pathname = `products/blob-check-${Date.now()}.png`;

try {
  const uploaded = await put(pathname, PNG, {
    access: "public",
    contentType: "image/png",
  });
  console.log("[blob:check] subido:", uploaded.url);

  const meta = await head(uploaded.url);
  console.log("[blob:check] metadata ok:", meta.pathname, meta.size, "bytes");

  await del(uploaded.url);
  console.log("[blob:check] borrado ✓ — Blob funcional, listo para usar");
} catch (error) {
  console.error(
    "[blob:check] fallo:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
