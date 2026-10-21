import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",;\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

// GET /api/admin/export/products — CSV catalog dump (all products incl.
// archived, flagged). Cookie-guarded: the proxy matcher doesn't cover /api/*.
export async function GET(): Promise<Response> {
  if (!(await isAdmin())) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const header = [
    "Producto",
    "SKU",
    "Categoria",
    "Precio",
    "Stock",
    "Disponible",
    "Archivado",
    "Talles",
    "Colores",
    "Tacos",
    "Creado",
    "Actualizado",
  ];

  const lines = [header.join(",")];
  for (const product of products) {
    lines.push(
      [
        product.name,
        product.code ?? "",
        product.category,
        product.price.toFixed(2),
        product.stock,
        product.available ? "si" : "no",
        product.archivedAt ? "si" : "no",
        product.sizes.join("; "),
        product.colors.join("; "),
        product.tacoOptions.join("; "),
        product.createdAt.toISOString(),
        product.updatedAt.toISOString(),
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="productos-${stamp}.csv"`,
    },
  });
}
