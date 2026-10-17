import fs from "fs";
import path from "path";
import { colorSlug, findAliasForColor } from "../lib/color-aliases";

type CsvRow = {
  codigo: string;
  nombreVenta: string;
  nombreCompra: string;
  talles: string;
  precioVenta: string;
  colores: string;
};

const PHOTO_FILE_RE = /^(\d+)(_([\w-]+))?\.(\w+)$/;

const PUBLIC_DIR = "public/assets/products";
const CSV_PATH = `${PUBLIC_DIR}/products.csv`;

type Plan = {
  renames: { from: string; to: string }[];
  copies: { from: string; to: string }[];
  deletes: { path: string; reason: string }[];
  warnings: string[];
  folders: { folder: string; csvColors: string[] }[];
};

function parseCsv(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",").map((h) => h.trim());
  const idx = (k: string) => header.indexOf(k);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    const cols = parseCsvLine(raw);
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

function csvColorsList(row: CsvRow): string[] {
  return row.colores
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

function folderNameForCSV(nombreVenta: string): string {
  return nombreVenta
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function readdirSafe(p: string): string[] {
  try {
    return fs.readdirSync(p);
  } catch {
    return [];
  }
}

function findActualFolder(targetName: string): string | null {
  const folders = readdirSafe(PUBLIC_DIR);
  return folders.find((f) => f.toLowerCase() === targetName.toLowerCase()) ?? null;
}

function planProduct(row: CsvRow): {
  renames: { from: string; to: string }[];
  copies: { from: string; to: string }[];
  deletes: { path: string; reason: string }[];
  warnings: string[];
} {
  const renames: { from: string; to: string }[] = [];
  const copies: { from: string; to: string }[] = [];
  const deletes: { path: string; reason: string }[] = [];
  const warnings: string[] = [];

  const targetFolder = folderNameForCSV(row.nombreVenta);
  const folderName = findActualFolder(targetFolder);
  if (!folderName) {
    warnings.push(`Carpeta no encontrada para "${row.nombreVenta}" (buscada como ${targetFolder})`);
    return { renames, copies, deletes, warnings };
  }
  const folderPath = `${PUBLIC_DIR}/${folderName}`;
  const allFiles = readdirSafe(folderPath);

  if (allFiles.length === 0) {
    warnings.push(`Carpeta no encontrada: ${folderPath}`);
    return { renames, copies, deletes, warnings };
  }

  const colorFiles = allFiles.filter((f) => PHOTO_FILE_RE.test(f));
  const extras = allFiles.filter((f) => !PHOTO_FILE_RE.test(f));
  if (extras.length > 0) {
    warnings.push(
      `Extras ignorados en ${folderName}/: ${extras.join(", ")}`
    );
  }

  const csvColors = csvColorsList(row);
  const hasColorSuffix = colorFiles.some((f) => /^(\d+)_/.test(f));

  if (!hasColorSuffix && csvColors.length === 1) {
    const slug = colorSlug(csvColors[0]);
    for (const f of colorFiles) {
      const m = f.match(PHOTO_FILE_RE)!;
      const num = m[1];
      const ext = m[4];
      const newName = `${num}_${slug}.${ext}`;
      renames.push({ from: `${folderName}/${f}`, to: `${folderName}/${newName}` });
    }
    return { renames, copies, deletes, warnings };
  }

  if (!hasColorSuffix && csvColors.length > 1) {
    for (const csvColor of csvColors) {
      const targetSlug = colorSlug(csvColor);
      for (const f of colorFiles) {
        const m = f.match(PHOTO_FILE_RE)!;
        const num = m[1];
        const ext = m[4];
        const newName = `${num}_${targetSlug}.${ext}`;
        copies.push({ from: `${folderName}/${f}`, to: `${folderName}/${newName}` });
      }
    }
    return { renames, copies, deletes, warnings };
  }

  const targetSlugs = new Set(csvColors.map(colorSlug));
  const availableSlugs = new Set<string>();
  const filesBySlug = new Map<string, string[]>();
  for (const f of colorFiles) {
    const m = f.match(PHOTO_FILE_RE)!;
    const slug = m[3];
    if (!slug) continue;
    availableSlugs.add(slug);
    if (!filesBySlug.has(slug)) filesBySlug.set(slug, []);
    filesBySlug.get(slug)!.push(f);
  }

  for (const csvColor of csvColors) {
    const targetSlug = colorSlug(csvColor);
    const exact = filesBySlug.get(targetSlug);
    if (exact && exact.length > 0) continue;

    const alias = findAliasForColor(csvColor, availableSlugs);
    if (!alias) {
      warnings.push(
        `${folderName}: no hay archivos (ni por alias) para "${csvColor}" → se copiará desde el primer color del CSV`
      );
      const firstColor = csvColors[0];
      const firstSlug = colorSlug(firstColor);
      const firstFiles = filesBySlug.get(firstSlug);
      if (!firstFiles || firstFiles.length === 0) {
        warnings.push(`${folderName}: tampoco hay archivos del primer color "${firstColor}"`);
        continue;
      }
      for (const f of firstFiles) {
        const m = f.match(PHOTO_FILE_RE)!;
        const num = m[1];
        const ext = m[4];
        const newName = `${num}_${targetSlug}.${ext}`;
        copies.push({ from: `${folderName}/${f}`, to: `${folderName}/${newName}` });
      }
      filesBySlug.set(targetSlug, firstFiles.map((f) => f.replace(/_\w+\./, `_${targetSlug}.`)));
      availableSlugs.add(targetSlug);
      continue;
    }

    const aliasFiles = filesBySlug.get(alias);
    if (!aliasFiles) continue;
    for (const f of aliasFiles) {
      const m = f.match(PHOTO_FILE_RE)!;
      const num = m[1];
      const ext = m[4];
      const newName = `${num}_${targetSlug}.${ext}`;
      renames.push({ from: `${folderName}/${f}`, to: `${folderName}/${newName}` });
    }
    filesBySlug.set(targetSlug, aliasFiles);
    availableSlugs.delete(alias);
    filesBySlug.delete(alias);
  }

  const renamedSources = new Set(renames.filter((r) => r.from.startsWith(`${folderName}/`)).map((r) => r.from));
  for (const f of colorFiles) {
    if (renamedSources.has(`${folderName}/${f}`)) continue;
    const m = f.match(PHOTO_FILE_RE)!;
    const slug = m[3];
    if (!slug) continue;
    if (!targetSlugs.has(slug)) {
      deletes.push({
        path: `${folderName}/${f}`,
        reason: `color "${slug}" no está en CSV (${csvColors.join(", ")})`,
      });
    }
  }

  return { renames, copies, deletes, warnings };
}

function buildPlan(): Plan {
  const csvRaw = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCsv(csvRaw);
  const renames: { from: string; to: string }[] = [];
  const copies: { from: string; to: string }[] = [];
  const deletes: { path: string; reason: string }[] = [];
  const warnings: string[] = [];
  const folders: { folder: string; csvColors: string[] }[] = [];

  for (const row of rows) {
    const p = planProduct(row);
    renames.push(...p.renames);
    copies.push(...p.copies);
    deletes.push(...p.deletes);
    warnings.push(...p.warnings);
    folders.push({ folder: findActualFolder(folderNameForCSV(row.nombreVenta)) ?? folderNameForCSV(row.nombreVenta), csvColors: csvColorsList(row) });
  }

  return { renames, copies, deletes, warnings, folders };
}

function printPlan(plan: Plan, dryRun: boolean): void {
  const tag = dryRun ? "[DRY-RUN]" : "[EXEC]";
  console.log(`\n=== ${tag} Normalize photos ===\n`);

  console.log(`📁 Productos a procesar: ${plan.folders.length}`);
  console.log(`✏️  Renames: ${plan.renames.length}`);
  console.log(`📋 Copies:  ${plan.copies.length}`);
  console.log(`🗑️  Deletes: ${plan.deletes.length}`);
  console.log(`⚠️  Warnings: ${plan.warnings.length}\n`);

  if (plan.renames.length > 0) {
    console.log("--- RENAMES ---");
    for (const r of plan.renames) {
      console.log(`  ${r.from}  →  ${r.to}`);
    }
    console.log();
  }

  if (plan.copies.length > 0) {
    console.log("--- COPIES ---");
    for (const c of plan.copies) {
      console.log(`  ${c.from}  →  ${c.to}  (copia)`);
    }
    console.log();
  }

  if (plan.deletes.length > 0) {
    console.log("--- DELETES ---");
    for (const d of plan.deletes) {
      console.log(`  ${d.path}  (${d.reason})`);
    }
    console.log();
  }

  if (plan.warnings.length > 0) {
    console.log("--- WARNINGS ---");
    for (const w of plan.warnings) {
      console.log(`  ${w}`);
    }
    console.log();
  }
}

function executePlan(plan: Plan): void {
  for (const r of plan.renames) {
    const from = path.join(PUBLIC_DIR, r.from);
    const to = path.join(PUBLIC_DIR, r.to);
    fs.renameSync(from, to);
  }
  for (const c of plan.copies) {
    const from = path.join(PUBLIC_DIR, c.from);
    const to = path.join(PUBLIC_DIR, c.to);
    fs.copyFileSync(from, to);
  }
  for (const d of plan.deletes) {
    const p = path.join(PUBLIC_DIR, d.path);
    try {
      fs.unlinkSync(p);
    } catch {}
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--apply");

  const plan = buildPlan();
  printPlan(plan, dryRun);

  if (dryRun) {
    console.log("Esto fue un DRY-RUN. Para aplicar cambios, corré con --apply\n");
    return;
  }

  executePlan(plan);
  console.log("✅ Normalización aplicada.\n");
}

main();
