import Link from "next/link";
import prisma from "@/lib/prisma";
import { num } from "@/lib/money";
import OrdersTable from "@/components/admin/orders/OrdersTable";
import OrdersFilterBar from "@/components/admin/orders/OrdersFilterBar";
import type { AdminOrderRow } from "@/types/admin";
import type { Prisma } from "@prisma/client";

export const metadata = {
  title: "Pedidos",
};

const PER_PAGE = 20;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = first(params.q).trim();
  const status = first(params.status);
  const archived = first(params.archived) === "1";
  const page = Math.max(1, Number(first(params.page)) || 1);

  const where: Prisma.OrderWhereInput = {
    archivedAt: archived ? { not: null } : null,
  };
  if (status === "preparing") {
    where.status = "approved";
    where.shipmentId = null;
  } else if (status === "shipped") {
    where.status = "approved";
    where.shipmentId = { not: null };
  } else if (status) {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { username: { contains: q, mode: "insensitive" } } },
      { recipientName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        user: { select: { username: true, email: true } },
        _count: { select: { orderItems: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const rows: AdminOrderRow[] = orders.map((order) => ({
    id: order.id,
    status: order.status,
    total: num(order.total),
    createdAt: order.createdAt,
    archivedAt: order.archivedAt,
    source: order.source,
    itemsCount: order._count.orderItems,
    couponCode: order.couponCode,
    shipmentId: order.shipmentId,
    dispatchedAt: order.dispatchedAt,
    shipmentStatus: order.shipmentStatus,
    user: order.user,
  }));

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const paginateHref = (target: number) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (status) search.set("status", status);
    if (archived) search.set("archived", "1");
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return `/admin/pedidos${query ? `?${query}` : ""}`;
  };

  return (
    <main className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1 className="admin-title">Pedidos</h1>
        <Link href="/admin/pedidos/nuevo" className="admin-button primary">
          + Nuevo pedido manual
        </Link>
      </div>

      <OrdersFilterBar status={status} q={q} archived={archived} />

      <OrdersTable rows={rows} />

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
            Página {page} de {pages} · {total} pedido(s)
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
