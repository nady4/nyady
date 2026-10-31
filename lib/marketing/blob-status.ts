/**
 * Blob client-upload readiness.
 *
 * Browser uploads (the admin's image pickers) use the Blob "client token"
 * flow, which REQUIRES a read-write token (BLOB_READ_WRITE_TOKEN). The
 * Vercel OIDC connection only covers server-side writes (put/del) — so the
 * OIDC setup alone cannot serve uploads from the browser. This helper tells
 * the UI (and the upload route) whether that token is configured, so the
 * admin gets an actionable message instead of the SDK's opaque
 * "Failed to retrieve the client token".
 */

export interface BlobClientUploadStatus {
  ready: boolean;
  error: string | null;
}

const MISSING_TOKEN_MESSAGE =
  "Las subidas de imágenes desde el navegador necesitan BLOB_READ_WRITE_TOKEN. " +
  "Generá un token read-write en el dashboard de Blob de Vercel y agregalo como variable de entorno (Production) — y redeployá.";

export function blobClientUploadStatus(): BlobClientUploadStatus {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return { ready: true, error: null };
  }
  return { ready: false, error: MISSING_TOKEN_MESSAGE };
}
