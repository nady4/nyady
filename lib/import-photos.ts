import fs from "fs";
import path from "path";
import { colorSlug } from "./color-aliases";

const PHOTO_FILE_RE = /^(\d+)_([\w-]+)\.(\w+)$/;
const PUBLIC_PRODUCTS_DIR = path.join(process.cwd(), "public/assets/products");

export function findProductFolder(nombreVenta: string): string | null {
  const target = nombreVenta
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (!fs.existsSync(PUBLIC_PRODUCTS_DIR)) return null;
  const folders = fs.readdirSync(PUBLIC_PRODUCTS_DIR);
  return folders.find((f) => f.toLowerCase() === target.toLowerCase()) ?? null;
}

export function buildPhotosMap(
  folderName: string,
  csvColors: string[]
): { photo: string; photos: Record<string, string[]> } | null {
  const folderPath = path.join(PUBLIC_PRODUCTS_DIR, folderName);
  if (!fs.existsSync(folderPath)) return null;

  const allFiles = fs.readdirSync(folderPath);
  const colorFiles = allFiles.filter((f) => PHOTO_FILE_RE.test(f));
  if (colorFiles.length === 0) return null;

  const grouped: Record<string, string[]> = {};
  for (const f of colorFiles) {
    const m = f.match(PHOTO_FILE_RE)!;
    const slug = m[2];
    const matchedColor =
      csvColors.find((c) => colorSlug(c) === slug.toLowerCase()) ?? slug;
    if (!grouped[matchedColor]) grouped[matchedColor] = [];
    grouped[matchedColor].push(`/assets/products/${folderName}/${f}`);
  }

  for (const k of Object.keys(grouped)) {
    grouped[k].sort();
  }

  const firstColor = csvColors.find((c) => grouped[c]?.length > 0);
  const photo = firstColor
    ? grouped[firstColor][0]
    : Object.values(grouped)[0][0];

  return { photo, photos: grouped };
}
