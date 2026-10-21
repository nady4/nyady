import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
const ALLOWED_PREFIXES = ["products/", "banners/"];

// POST /api/admin/upload
// Vercel Blob client-upload token endpoint. The browser asks for a token and
// then PUTs the file straight to Blob storage, avoiding request-body limits.
// The admin session cookie is validated here (the proxy matcher doesn't
// cover /api/admin/*).
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
      onBeforeGenerateToken: async (pathname) => {
        if (!(await isAdmin())) {
          throw new Error("No autorizado");
        }
        if (!ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
          throw new Error("Ruta de carga no permitida");
        }
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE_BYTES,
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
    const friendly = /blob.*token|BLOB_READ_WRITE_TOKEN|access token/i.test(raw)
      ? "Las subidas no están configuradas: falta el token de Vercel Blob (BLOB_READ_WRITE_TOKEN)"
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
