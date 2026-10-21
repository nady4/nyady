import prisma from "@/lib/prisma";
import CategoriesAdmin from "@/components/admin/categories/CategoriesAdmin";
import type { AdminCategoryRow } from "@/types/admin";

export const metadata = {
  title: "Categorías",
};

export default async function AdminCategoriesPage() {
  const [active, archivedRows] = await Promise.all([
    prisma.product.groupBy({
      by: ["category"],
      where: { archivedAt: null },
      _count: { _all: true },
      orderBy: { category: "asc" },
    }),
    prisma.product.groupBy({
      by: ["category"],
      where: { archivedAt: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const archivedByCategory = new Map(
    archivedRows.map((row) => [row.category, row._count._all])
  );

  const rows: AdminCategoryRow[] = active.map((row) => ({
    category: row.category,
    active: row._count._all,
    archived: archivedByCategory.get(row.category) ?? 0,
  }));

  return (
    <main className="admin-page admin-page-wide">
      <h1 className="admin-title">Categorías</h1>
      <CategoriesAdmin rows={rows} />
    </main>
  );
}
