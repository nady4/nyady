/**
 * Sincroniza el catálogo con la carpeta local de fotos
 * (public/assets/products) como fuente de verdad:
 *
 *  1. Colores sin foto se eliminan del producto (DB + products.csv).
 *  2. Todas las fotos se re-suben a Vercel Blob (rutas deterministas con
 *     overwrite) y se re-escriben `photo` / `photos` en la DB.
 *  3. Los talles dobles (21/22 … 33/34) menores a 35 se eliminan de la
 *     disponibilidad; un producto que queda sin talles recibe 35-40.
 *  4. Se limpian carritos que referencien variantes eliminadas.
 *
 * DRY-RUN por defecto; `--apply` ejecuta los cambios;
 * `--csv-only` sólo reescribe products.csv (sin Blob ni DB).
 */
import fs from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { PrismaClient, Prisma } from "@prisma/client";
import { colorSlug, findAliasForColor } from "../lib/color-aliases";

const prisma = new PrismaClient();

const PHOTO_FILE_RE = /^(\d+)_([\w-]+)\.(\w+)$/;
const UNSUFFIXED_RE = /^(\d+)\.(\w+)$/;
const PUBLIC_DIR = path.join(process.cwd(), "public/assets/products");
const CSV_PATH = path.join(PUBLIC_DIR, "products.csv");

const FALLBACK_SIZES = ["35", "36", "37", "38", "39", "40"];
const MIN_DOUBLE_SIZE = 35;
const POOL = 6;

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const c of line) {
    if (c === '"') inQuotes = !inQuotes;
    else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function csvField(v: string): string {
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function normName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function folderNameFor(nombreVenta: string): string {
  return nombreVenta.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/** Saca los talles dobles menores a 35 (21/22 … 33/34); mantiene el resto. */
function cleanSizes(sizes: string[]): string[] {
  return sizes.filter((s) => {
    const m = s.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
    if (!m) return true;
    return Math.min(Number(m[1]), Number(m[2])) >= MIN_DOUBLE_SIZE;
  });
}

/** Agrupa archivos `N_color.ext` por slug, apartando los sin sufijo. */
function classifyFolderFiles(
  folder: string
): { bySlug: Map<string, string[]>; unsuffixed: string[] } {
  const bySlug = new Map<string, string[]>();
  const unsuffixed: string[] = [];
  for (const f of fs.readdirSync(path.join(PUBLIC_DIR, folder))) {
    const m = f.match(PHOTO_FILE_RE);
    if (!m) {
      unsuffixed.push(f);
      continue;
    }
    const slug = m[2].toLowerCase();
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug)!.push(f);
  }
  for (const files of bySlug.values()) {
    files.sort(
      (a, b) =>
        Number(a.match(PHOTO_FILE_RE)![1]) - Number(b.match(PHOTO_FILE_RE)![1]) ||
        a.localeCompare(b)
    );
  }
  return { bySlug, unsuffixed };
}

/** Asigna cada color a su slug exacto y luego por alias, sin repetir slugs. */
function resolveColorSlugs(
  colors: string[],
  bySlug: Map<string, string[]>
): { colorBySlug: Map<string, string>; removed: string[] } {
  const colorBySlug = new Map<string, string>();
  const removed: string[] = [];
  const freeSlugs = new Set(bySlug.keys());

  for (const color of colors) {
    const slug = colorSlug(color);
    if (freeSlugs.has(slug)) {
      colorBySlug.set(color, slug);
      freeSlugs.delete(slug);
    } else {
      removed.push(color);
    }
  }
  for (const color of [...removed]) {
    const alias = findAliasForColor(color, freeSlugs);
    if (!alias) continue;
    colorBySlug.set(color, alias);
    freeSlugs.delete(alias);
    removed.splice(removed.indexOf(color), 1);
  }
  return { colorBySlug, removed };
}

type DbProduct = {
  id: string;
  code: string | null;
  name: string;
  photo: string;
  sizes: string[];
  colors: string[];
};

type PlanRow = {
  db: DbProduct;
  csvLine: number | null; // índice de la línea del CSV (null = producto huérfano)
  folder: string | null;
  colorBySlug: Map<string, string>;
  removedColors: string[];
  removedSizes: string[];
  newSizes: string[];
};

type UploadTask = {
  productId: string;
  folder: string;
  file: string;
  contentType: string;
};

function collectUploadTasks(plan: PlanRow): UploadTask[] {
  if (!plan.folder) return [];
  const { bySlug } = classifyFolderFiles(plan.folder);
  const tasks: UploadTask[] = [];
  for (const slug of plan.colorBySlug.values()) {
    for (const file of bySlug.get(slug) ?? []) {
      tasks.push({
        productId: plan.db.id,
        folder: plan.folder,
        file,
        contentType:
          CONTENT_TYPES[path.extname(file).toLowerCase()] ?? "image/jpeg",
      });
    }
  }
  return tasks;
}

/** Color de portada: el color de la foto de portada vieja, si sobrevive. */
function coverColorFor(dbPhoto: string, colors: string[]): string {
  const base = dbPhoto.split("/").pop() ?? "";
  const m = base.match(/^(\d+)(?:_([\w-]+))?\.\w+$/);
  if (m?.[2]) {
    const color = colors.find((c) => colorSlug(c) === m[2]!.toLowerCase());
    if (color) return color;
  }
  return colors[0];
}

function cartWhere(plans: PlanRow[]): Prisma.CartWhereInput {
  const or: Prisma.CartWhereInput[] = [];
  for (const p of plans) {
    if (p.removedColors.length > 0) {
      or.push({ productId: p.db.id, selectedColor: { in: p.removedColors } });
    }
    if (p.removedSizes.length > 0) {
      or.push({ productId: p.db.id, selectedSize: { in: p.removedSizes } });
    }
  }
  return or.length ? { OR: or } : { id: "__ninguno__" };
}

async function uploadPool(tasks: UploadTask[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>(); // `${productId}:${file}` → blob url
  let done = 0;
  for (let i = 0; i < tasks.length; i += POOL) {
    const batch = await Promise.all(
      tasks.slice(i, i + POOL).map(async (t) => {
        const blob = await put(
          `products/${t.folder}/${t.file}`,
          fs.readFileSync(path.join(PUBLIC_DIR, t.folder, t.file)),
          {
            access: "public",
            contentType: t.contentType,
            addRandomSuffix: false,
            allowOverwrite: true,
          }
        );
        return [`${t.productId}:${t.file}`, blob.url] as const;
      })
    );
    for (const [key, url] of batch) urls.set(key, url);
    done += batch.length;
    console.log(`  ↥ subidas ${done}/${tasks.length}`);
  }
  return urls;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const csvOnly = process.argv.includes("--csv-only");

  const rawCsv = fs.readFileSync(CSV_PATH, "utf-8");
  const allLines = rawCsv.split(/\r?\n/);
  const header = allLines[0].split(",").map((h) => h.trim());
  const iCode = header.indexOf("Código");
  const iName = header.indexOf("Nombre venta");
  const iTalles = header.indexOf("Talles");
  const iColores = header.indexOf("Colores");

  const dbProducts = await prisma.product.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      photo: true,
      sizes: true,
      colors: true,
      available: true,
    },
  });
  const dbByNormName = new Map(dbProducts.map((p) => [normName(p.name), p]));

  // Un plan por fila del CSV, con la línea de origen guardada
  const plans: PlanRow[] = [];
  const matchedDbIds = new Set<string>();

  for (let lineIdx = 1; lineIdx < allLines.length; lineIdx++) {
    const line = allLines[lineIdx];
    if (!line || !line.trim()) continue;
    const cols = parseCsvLine(line);
    const codigo = cols[iCode]?.trim() ?? "";
    const nombreVenta = cols[iName]?.trim() ?? "";
    const db =
      dbProducts.find((p) => p.code === codigo) ??
      dbByNormName.get(normName(nombreVenta));
    if (!db) {
      console.warn(
        `⚠️  Fila del CSV sin producto en DB: ${nombreVenta} (${codigo})`
      );
      continue;
    }
    matchedDbIds.add(db.id);

    const target = folderNameFor(nombreVenta);
    const folder =
      fs
        .readdirSync(PUBLIC_DIR)
        .find((f) => f.toLowerCase() === target.toLowerCase()) ?? null;

    const csvColors = (cols[iColores] ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const colors = db.colors.length ? db.colors : csvColors;

    let colorBySlug = new Map<string, string>();
    const removedColors: string[] = [];

    if (folder) {
      const { bySlug, unsuffixed } = classifyFolderFiles(folder);
      // Carpeta sin `N_color.ext`: si hay un único color, se renombra
      const slug = colorSlug(colors[0]);
      if (bySlug.size === 0 && unsuffixed.length > 0 && colors.length === 1) {
        if (apply) {
          for (const f of unsuffixed) {
            const m = f.match(UNSUFFIXED_RE)!;
            fs.renameSync(
              path.join(PUBLIC_DIR, folder, f),
              path.join(PUBLIC_DIR, folder, `${m[1]}_${slug}.${m[2]}`)
            );
          }
          console.log(`  ✎ ${folder}: fotos renombradas con color ${slug}`);
        }
        bySlug.set(
          slug,
          unsuffixed.map((f) => {
            const m = f.match(UNSUFFIXED_RE)!;
            return `${m[1]}_${slug}.${m[2]}`;
          })
        );
      }
      const resolved = resolveColorSlugs(colors, bySlug);
      colorBySlug = resolved.colorBySlug;
      removedColors.push(...resolved.removed);
    }

    const newSizes = cleanSizes([...db.sizes]);
    if (newSizes.length === 0) newSizes.push(...FALLBACK_SIZES);
    const removedSizes = db.sizes.filter((s) => !newSizes.includes(s));

    plans.push({
      db,
      csvLine: lineIdx,
      folder,
      colorBySlug,
      removedColors,
      removedSizes,
      newSizes,
    });
  }

  // Productos de DB que ya no están en el CSV: limpiar talles igual
  for (const db of dbProducts) {
    if (matchedDbIds.has(db.id)) continue;
    const newSizes = cleanSizes([...db.sizes]);
    if (newSizes.length === 0) newSizes.push(...FALLBACK_SIZES);
    plans.push({
      db,
      csvLine: null,
      folder: null,
      colorBySlug: new Map(),
      removedColors: [],
      removedSizes: db.sizes.filter((s) => !newSizes.includes(s)),
      newSizes,
    });
  }

  const realPlans = plans;
  const uploadTasks = realPlans.flatMap(collectUploadTasks);

  console.log(`\n=== ${apply ? (csvOnly ? "[EXEC][csv-only]" : "[EXEC]") : "[DRY-RUN]"} Sync catálogo ===\n`);

  for (const p of realPlans) {
    let summary = "";
    if (p.folder) {
      const { bySlug } = classifyFolderFiles(p.folder);
      const n = collectUploadTasks(p).length;
      summary = `fotos: ${n} archivo(s) a Blob — colores: [${[
        ...p.colorBySlug.keys(),
      ]
        .map((c) => `${c} (${(bySlug.get(p.colorBySlug.get(c)!) ?? []).length})`)
        .join(", ")}]`;
      if (p.removedColors.length > 0) {
        summary += `  ← saco colores sin foto: ${p.removedColors.join(", ")}`;
      }
    } else {
      summary = "sin carpeta de fotos (colores y fotos no se tocan)";
    }
    if (p.removedSizes.length > 0) {
      summary += ` — saco talles: ${p.removedSizes.join(" ")} — quedan: ${p.newSizes.join(" ")}`;
    }
    console.log(`• ${p.db.name} ${p.db.code ? `(${p.db.code})` : ""}`);
    console.log(`    ${summary}`);
  }

  console.log(`\nArchivos a subir a Blob: ${uploadTasks.length}`);
  console.log(
    `Carritos con variantes eliminadas: ${await prisma.cart.count({ where: cartWhere(realPlans) })}`
  );

  if (!apply) {
    console.log("\nEsto fue un DRY-RUN. Para aplicar cambios, corré con --apply\n");
    return;
  }

  console.log("\n🚧 Ejecutando…\n");

  if (csvOnly) {
    console.log("(modo --csv-only: no se tocan Blob ni la DB)\n");
  } else {
    console.log("↥ Subiendo fotos a Vercel Blob…");
    const urls = await uploadPool(uploadTasks);

    console.log("\n↘ Actualizando productos…");
    let updated = 0;
    for (const p of realPlans) {
      const data: Record<string, unknown> = {};
      const keptColors = [...p.colorBySlug.keys()];
      const sizesChanged = p.removedSizes.length > 0;
      const photoChanged = p.folder !== null;

      if (photoChanged) {
        if (keptColors.length === 0) {
          throw new Error(`${p.db.id}: quedó sin colores con foto`);
        }
        const { bySlug } = classifyFolderFiles(p.folder!);
        const photos: Record<string, string[]> = {};
        for (const color of keptColors) {
          photos[color] = (bySlug.get(p.colorBySlug.get(color)!) ?? []).map(
            (file) => urls.get(`${p.db.id}:${file}`)!
          );
        }
        data.photos = photos;
        data.photo = photos[coverColorFor(p.db.photo, keptColors)][0];
        data.colors = keptColors;
      }
      if (sizesChanged) data.sizes = p.newSizes;

      if (Object.keys(data).length === 0) continue;
      await prisma.product.update({ where: { id: p.db.id }, data });
      updated += 1;

      const labels: string[] = [];
      if (photoChanged) {
        const cover = coverColorFor(p.db.photo, keptColors);
        labels.push(
          `portada ${cover}${p.removedColors.length ? ` | colores: ${keptColors.join(", ")}` : ""}`
        );
      }
      if (sizesChanged) {
        labels.push(
          p.db.sizes.length > 0
            ? `talles: ${p.newSizes.join(" ")}`
            : `sin talles antes, ahora ${p.newSizes.join(" ")}`
        );
      }
      console.log(`  ✓ ${p.db.name}: ${labels.join(" | ") || "fotos re-subidas"}`);
    }
    console.log(`  (${updated} productos con cambios)`);

    const deletedCarts = await prisma.cart.deleteMany({ where: cartWhere(realPlans) });
    console.log(`\n✓ Carritos borrados (variante ya inexistente): ${deletedCarts.count}`);
  }

  console.log("\n✎ Actualizando products.csv…");
  let csvChanged = 0;
  const hadTrailingNewline = rawCsv.endsWith("\n");
  for (const plan of realPlans) {
    if (plan.csvLine === null) continue;
    const raw = allLines[plan.csvLine];
    if (!raw || !raw.trim()) continue;
    const cols = parseCsvLine(raw);
    if ((cols[iName]?.trim() ?? "") !== plan.db.name) {
      console.warn(
        `⚠️  Línea ${plan.csvLine} no coincide con "${plan.db.name}" — se salta`
      );
      continue;
    }
    if (iTalles >= 0) {
      const tallesCsv = (cols[iTalles] ?? "").trim();
      const tallesFinal = plan.newSizes.join(", ");
      if (tallesFinal !== tallesCsv) cols[iTalles] = tallesFinal;
    }
    if (iColores >= 0 && plan.colorBySlug.size > 0) {
      const csvColors = (cols[iColores] ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      const kept = csvColors.filter((c) => plan.colorBySlug.has(c));
      if (kept.length > 0 && kept.join(", ") !== csvColors.join(", ")) {
        cols[iColores] = kept.join(", ");
      }
    }
    const next = cols.map(csvField).join(",");
    if (next !== raw) {
      allLines[plan.csvLine] = next;
      csvChanged += 1;
    }
  }
  const content = allLines.join("\n");
  fs.writeFileSync(
    CSV_PATH,
    content.endsWith("\n") ? content : content + (hadTrailingNewline ? "\n" : "")
  );
  console.log(`✓ products.csv: ${csvChanged} filas actualizadas\n`);

  console.log("✅ Sync completado.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
