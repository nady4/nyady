import fs from "fs";
import path from "path";
import { PrismaClient, Prisma } from "@prisma/client";
import { buildPhotosMap, findProductFolder } from "../lib/import-photos";

const prisma = new PrismaClient();
const CSV_PATH = path.join(process.cwd(), "public/assets/products/products.csv");

type CsvRow = {
  codigo: string;
  nombreVenta: string;
  nombreCompra: string;
  talles: string;
  precioVenta: string;
  colores: string;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",").map((h) => h.trim());
  const idx = (k: string) => header.indexOf(k);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < header.length) continue;
    rows.push({
      codigo: cols[idx("Código")]?.trim() ?? "",
      nombreVenta: cols[idx("Nombre venta")]?.trim() ?? "",
      nombreCompra: cols[idx("Nombre compra")]?.trim() ?? "",
      talles: cols[idx("Talles")]?.trim() ?? "",
      precioVenta: cols[idx("Precio venta")]?.trim() ?? "",
      colores: cols[idx("Colores")]?.trim() ?? "",
    });
  }
  return rows;
}

function parsePrice(raw: string): number {
  return Number(raw.replace(/[$\s]/g, "").replace(/,/g, ""));
}

function parseList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function categoryForCode(code: string): string {
  if (code.startsWith("S-")) return "Sandalias";
  if (code.startsWith("PB-")) return "Pantubotas";
  if (code === "PC") return "Pantuflas";
  if (code === "HB" || code === "HC") return "Hornitos";
  if (code === "PF") return "Pantuflas";
  if (code === "C") return "Chinelas";
  return "Otros";
}

function productIdForRow(row: CsvRow): string {
  const folder = findProductFolder(row.nombreVenta);
  if (folder) {
    return slugify(folder);
  }
  if (row.codigo.startsWith("S-")) return slugify(row.nombreVenta);
  return slugify(`${row.codigo}-${row.nombreVenta}`);
}

function normalizeForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

type PlannedChange = {
  code: string;
  id: string;
  name: string;
  isNew: boolean;
  willUpdatePhoto: boolean;
  photo: string | null;
  warnings: string[];
};

async function planChanges(rows: CsvRow[]): Promise<{
  updates: PlannedChange[];
  warnings: string[];
  preExisting: number;
}> {
  const warnings: string[] = [];
  const updates: PlannedChange[] = [];
  const preExisting = await prisma.product.count();
  const allProducts = await prisma.product.findMany({
    select: { id: true, code: true, name: true, photo: true, photos: true },
  });
  const productsByNormName = new Map<string, typeof allProducts[number]>();
  for (const p of allProducts) {
    productsByNormName.set(normalizeForMatch(p.name), p);
  }

  for (const row of rows) {
    const id = productIdForRow(row);
    const existingByCode = await prisma.product.findFirst({
      where: { code: row.codigo },
      select: { id: true, photo: true, photos: true, name: true },
    });
    const existingByName = productsByNormName.get(normalizeForMatch(row.nombreVenta));
    const existing = existingByCode ?? existingByName;

    const folder = findProductFolder(row.nombreVenta);
    let photoInfo: { photo: string; photos: Record<string, string[]> } | null =
      null;
    if (folder) {
      const csvColors = parseList(row.colores);
      photoInfo = buildPhotosMap(folder, csvColors);
      if (!photoInfo) {
        warnings.push(`${row.nombreVenta}: carpeta "${folder}" sin archivos válidos`);
      }
    } else if (existing?.photo) {
      warnings.push(`${row.nombreVenta}: sin carpeta de fotos (se mantiene photo actual "${existing.photo.slice(0, 60)}...")`);
    } else {
      warnings.push(`${row.nombreVenta}: sin carpeta de fotos y sin producto previo (será creado sin foto)`);
    }

    updates.push({
      code: row.codigo,
      id,
      name: row.nombreVenta,
      isNew: !existing,
      willUpdatePhoto: !!photoInfo,
      photo: photoInfo?.photo ?? null,
      warnings: [],
    });
  }

  return { updates, warnings, preExisting };
}

function printPlan(plan: Awaited<ReturnType<typeof planChanges>>, dryRun: boolean): void {
  const tag = dryRun ? "[DRY-RUN]" : "[EXEC]";
  console.log(`\n=== ${tag} Import products ===\n`);
  console.log(`📊 Productos actuales en DB: ${plan.preExisting}`);
  console.log(`📥 Filas del CSV: ${plan.updates.length}`);
  const newCount = plan.updates.filter((u) => u.isNew).length;
  const updCount = plan.updates.filter((u) => !u.isNew).length;
  console.log(`   • Nuevos: ${newCount}`);
  console.log(`   • Updates: ${updCount}`);
  console.log(`⚠️  Warnings: ${plan.warnings.length}\n`);

  console.log("--- Primeros 10 productos ---");
  for (const u of plan.updates.slice(0, 10)) {
    console.log(
      `  [${u.isNew ? "NEW" : "UPD"}] ${u.code}  ${u.name}  (id=${u.id})  photo=${u.photo ?? "(mantiene)"}`
    );
  }
  if (plan.updates.length > 10) {
    console.log(`  ... y ${plan.updates.length - 10} más`);
  }
  console.log();

  if (plan.warnings.length > 0) {
    console.log("--- WARNINGS ---");
    for (const w of plan.warnings) console.log(`  ${w}`);
    console.log();
  }
}

async function executeImport(rows: CsvRow[]): Promise<void> {
  const marked = await prisma.product.updateMany({
    where: { available: true },
    data: { available: false },
  });
  console.log(`↘️  Marcados como no disponibles: ${marked.count}`);

  const allProducts = await prisma.product.findMany({
    select: { id: true, code: true, name: true, photo: true },
  });
  const productsByNormName = new Map<string, typeof allProducts[number]>();
  for (const p of allProducts) {
    productsByNormName.set(normalizeForMatch(p.name), p);
  }

  for (const row of rows) {
    const id = productIdForRow(row);
    const folder = findProductFolder(row.nombreVenta);
    const csvColors = parseList(row.colores);
    const sizes = parseList(row.talles);
    const price = parsePrice(row.precioVenta);
    const purchaseName = row.nombreCompra || null;
    const category = categoryForCode(row.codigo);

    let photoData: { photo: string; photos: Record<string, string[]> } | null =
      null;
    if (folder) {
      photoData = buildPhotosMap(folder, csvColors);
    }

    const existingByCode = await prisma.product.findFirst({
      where: { code: row.codigo },
      select: { id: true, photo: true },
    });
    const existingByName = productsByNormName.get(normalizeForMatch(row.nombreVenta));
    const existing = existingByCode ?? existingByName;

    const photoUrl = photoData?.photo ?? existing?.photo ?? "/assets/products/placeholder.png";
    const photosMap = photoData?.photos ?? Prisma.JsonNull;

    const productData = {
      code: row.codigo,
      name: row.nombreVenta,
      purchaseName,
      price,
      category,
      sizes,
      colors: csvColors,
      photo: photoUrl,
      photos: photosMap,
      available: true,
      description: null as string | null,
    };

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: productData,
      });
      console.log(`  ✓ Updated: ${row.codigo} ${row.nombreVenta} (id=${existing.id})`);
    } else {
      await prisma.product.create({
        data: {
          id,
          stock: 0,
          ...productData,
        },
      });
      console.log(`  + Created: ${row.codigo} ${row.nombreVenta} (id=${id})`);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--apply");

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`No se encontró el CSV en ${CSV_PATH}`);
    process.exit(1);
  }

  const csv = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCsv(csv);

  const plan = await planChanges(rows);
  printPlan(plan, dryRun);

  if (dryRun) {
    console.log("Esto fue un DRY-RUN. Para aplicar cambios, corré con --apply\n");
    return;
  }

  console.log("\n🚧 Ejecutando import real...\n");
  await executeImport(rows);

  const total = await prisma.product.count();
  const avail = await prisma.product.count({ where: { available: true } });
  const unavail = await prisma.product.count({ where: { available: false } });
  console.log(`\n✅ Import completado.`);
  console.log(`   Total: ${total} | Disponibles: ${avail} | No disponibles: ${unavail}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
