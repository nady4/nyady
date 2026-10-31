import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdmin } from "@/lib/admin";
import { blobClientUploadStatus } from "@/lib/marketing/blob-status";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB (photos)
const MAX_VIDEO_SIZE_BYTES = 60 * 1024 * 1024; // 60 MB (reels)
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
// Videos are only accepted under the social/ prefix (reels for Instagram).
const ALLOWED_VIDEO_TYPES = ["video/mp4"];
const ALLOWED_PREFIXES = ["products/", "banners/", "social/"];

// GET /api/admin/upload
// Readiness probe for the admin image pickers: browser uploads need a
// read-write Blob token (the OIDC connection only covers server-side writes).
export async function GET(): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const status = blobClientUploadStatus();
  return NextResponse.json(status);
}

// POST /api/admin/upload
// Vercel Blob client-upload token endpoint. The browser asks for a token
// here and then PUTs the file straight to Blob storage, avoiding
// request-body limits. The admin session cookie is validated here (the
// proxy matcher doesn't cover /api/admin/*).
export async function POST(request: Request): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json(
      { error: "Solicitud inválida" },
      { status: 400 }
    );
  }

  try {
    const json = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await isAdmin())) {
          throw new Error("No autorizado");
        }
        if (!ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
          throw new Error("Ruta de carga no permitida");
        }
        // Reels (video) only make sense under social/; photos keep the
        // stricter limit everywhere else.
        const isSocial = pathname.startsWith("social/");
        return {
          allowedContentTypes: isSocial
            ? [...ALLOWED_TYPES, ...ALLOWED_VIDEO_TYPES]
            : ALLOWED_TYPES,
          maximumSizeInBytes: isSocial ? MAX_VIDEO_SIZE_BYTES : MAX_SIZE_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // No-op: the image is linked to the product when the form is saved.
      },
    });

    return NextResponse.json(json);
  } catch (error) {
    const raw =
      error instanceof Error ? error.message : "No se pudo subir la imagen";
    const isAuth = raw.toLowerCase().includes("no autorizado");
    const missingToken =
      raw.toLowerCase().includes("read-write token") ||
      raw.toLowerCase().includes("no blob credentials");
    const friendly = missingToken
      ? blobClientUploadStatus().error ?? raw
      : raw.includes("No autorizado") || raw.includes("no permitida")
        ? raw
        : "No se pudo subir la imagen";
    console.error("[admin/upload]", raw);

    return NextResponse.json(
      { error: friendly },
      { status: isAuth ? 401 : 500 }
    );
  }
}
