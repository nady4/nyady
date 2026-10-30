import { put } from "@vercel/blob";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Instagram accepts JPEG only for image_url posts. The catalog stores
 * png/webp occasionally (admin uploads, normalize-photos pipeline), so before
 * creating IG containers we surface a JPEG copy on the Blob (deterministic
 * path per source URL: same source never re-encodes).
 *
 * This runs server-side with the runtime Blob token (OIDC on Vercel); the
 * browser-side upload endpoint doesn't need to know about it.
 */

const MAX_SOURCE_BYTES = 8 * 1024 * 1024; // IG's own cap for image_url
type SharpFactory = (input: Buffer | string) => any;
let sharpFactory: SharpFactory | null = null;

async function loadSharp(): Promise<SharpFactory> {
  if (!sharpFactory) {
    const mod: any = await import("sharp");
    sharpFactory = (mod.default ?? mod) as SharpFactory;
  }
  return sharpFactory;
}

function deterministicJpgPath(sourceUrl: string): string {
  let hash = 0x811c9dc5; // FNV-1a 32-bit, stable across processes
  for (let i = 0; i < sourceUrl.length; i += 1) {
    hash ^= sourceUrl.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hashHex = (hash >>> 0).toString(16).padStart(8, "0");
  return `social/ig-jpg/${hashHex}.jpg`;
}

export function looksLikeInstagramCompatibleJpeg(url: string): boolean {
  const clean = url.split("?")[0].toLowerCase();
  return clean.endsWith(".jpg") || clean.endsWith(".jpeg");
}

/** True when the URL is a non-JPEG image we should convert before IG. */
function needsConversion(url: string): boolean {
  return !looksLikeInstagramCompatibleJpeg(url);
}

/**
 * Returns a JPEG https URL for the given image: same URL when already JPEG,
 * otherwise a converted Blob copy (cached by deterministic path — an upload
 * with addRandomSuffix=false overwrites itself, so repeat publishes reuse
 * one file per source image).
 */
export async function ensureInstagramJpegUrl(
  sourceUrl: string
): Promise<string> {
  if (!sourceUrl.startsWith("http")) return sourceUrl;
  if (!needsConversion(sourceUrl)) return sourceUrl;

  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(
      `No se pudo descargar la imagen para convertir (${res.status}): ${sourceUrl}`
    );
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > MAX_SOURCE_BYTES) {
    throw new Error(`Imagen demasiado grande para Instagram (${sourceUrl})`);
  }

  const sharp = await loadSharp();
  const jpeg: Buffer = (await sharp(buffer)
    .rotate() // respect EXIF orientation before flattening
    .resize({ width: 1440, height: 1800, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer()) as Buffer;

  const blob = await put(deterministicJpgPath(sourceUrl), jpeg, {
    access: "public",
    addRandomSuffix: false,
    contentType: "image/jpeg",
  });
  return blob.url;
}

/** Waits for number of URLs, returns same-length array of JPEG-safe urls. */
export async function ensureInstagramJpegUrls(urls: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const url of urls) {
    out.push(await ensureInstagramJpegUrl(url));
  }
  return out;
}
