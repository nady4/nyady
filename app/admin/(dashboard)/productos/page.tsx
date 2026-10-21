import Link from "next/link";
import prisma from "@/lib/prisma";
import ProductsTable from "@/components/admin/products/ProductsTable";
import ProductsFilterBar from "@/components/admin/products/ProductsFilterBar";
import type { AdminProductRow } from "@/types/admin";
import type { Prisma } from "@prisma/client";

export const metadata = {
  title: "Productos",
};

const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  name: { name: "asc" },
  price_asc: { price: "asc" },
  price_desc: { price: "desc" },
  updated: { updatedAt: "desc" },
  recent: { createdAt: "desc" },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = first(params.q).trim();
  const category = first(params.category);
  const availability = first(params.availability);
  const archived = first(params.archived) === "1";
  const sort = first(params.sort) || "recent";
  const perPage = 20;
  const page = Math.max(1, Number(first(params.page)) || 1);

  const where: Prisma.ProductWhereInput = {
    archivedAt: archived ? { not: null } : null,
  };
  if (category) where.category = category;
  if (!archived && availability === "available") where.available = true;
  if (!archived && availability === "unavailable") where.available = false;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
      { purchaseName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [products, total, categoryRows] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: SORTS[sort] ?? SORTS.recent,
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        _count: { select: { orderItems: true, carts: true, wishLists: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
  ]);

  const rows: AdminProductRow[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    photo: product.photo,
    price: product.price,
    category: product.category,
    code: product.code,
    purchaseName: product.purchaseName,
    available: product.available,
    archivedAt: product.archivedAt,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    orderItems: product._count.orderItems,
    carts: product._count.carts,
    wishLists: product._count.wishLists,
  }));

  const pages = Math.max(1, Math.ceil(total / perPage));
  const paginateHref = (target: number) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (category) search.set("category", category);
    if (availability) search.set("availability", availability);
    if (archived) search.set("archived", "1");
    if (sort !== "recent") search.set("sort", sort);
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return `/admin/productos${query ? `?${query}` : ""}`;
  };

  return (
    <main className="admin-page admin-page-wide admin-products-page">
      <div className="admin-page-header">
        <h1 className="admin-title">Productos</h1>
        <Link href="/admin/productos/nuevo" className="admin-button primary">
          + Agregar producto
        </Link>
      </div>

      <ProductsFilterBar
        filters={{
          q,
          category,
          availability,
          archived,
          sort,
          page,
          perPage,
          categories: categoryRows.map((row) => row.category),
        }}
      />

      <ProductsTable rows={rows} />

      {pages > 1 && (
        <div className="admin-pagination">
          {page > 1 ? (
            <Link href={paginateHref(page - 1)} className="admin-button small">
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="admin-pagination-info">
            Página {page} de {pages} · {total} producto(s)
          </span>
          {page < pages ? (
            <Link href={paginateHref(page + 1)} className="admin-button small">
              Siguiente
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </main>
  );
}
