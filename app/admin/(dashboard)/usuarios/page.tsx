import Link from "next/link";
import prisma from "@/lib/prisma";
import UsersTable from "@/components/admin/users/UsersTable";
import UsersFilterBar from "@/components/admin/users/UsersFilterBar";
import type { AdminUserRow } from "@/types/admin";
import type { Prisma } from "@prisma/client";

export const metadata = {
  title: "Usuarios",
};

const PER_PAGE = 20;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = first(params.q).trim();
  const verified = first(params.verified);
  const hasOrders = first(params.hasOrders);
  const archived = first(params.archived) === "1";
  const page = Math.max(1, Number(first(params.page)) || 1);

  const where: Prisma.UserWhereInput = {
    archivedAt: archived ? { not: null } : null,
  };
  if (verified === "si") where.emailVerified = { not: null };
  if (verified === "no") where.emailVerified = null;
  if (hasOrders === "si") where.orders = { some: {} };
  if (hasOrders === "no") where.orders = { none: {} };
  if (q) {
    where.OR = [
      { username: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        address: { select: { street: true, city: true, state: true, postalCode: true } },
        _count: { select: { orders: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const rows: AdminUserRow[] = users.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    archivedAt: user.archivedAt,
    emailVerified: user.emailVerified,
    addressSummary: user.address
      ? `${user.address.street}, ${user.address.city}, ${user.address.state}`
      : null,
    ordersCount: user._count.orders,
  }));

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const paginateHref = (target: number) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (verified) search.set("verified", verified);
    if (hasOrders) search.set("hasOrders", hasOrders);
    if (archived) search.set("archived", "1");
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return `/admin/usuarios${query ? `?${query}` : ""}`;
  };

  return (
    <main className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1 className="admin-title">Usuarios</h1>
        <Link href="/admin/usuarios/nuevo" className="admin-button primary">
          + Nuevo usuario
        </Link>
      </div>

      <UsersFilterBar
        q={q}
        verified={verified}
        hasOrders={hasOrders}
        archived={archived}
      />

      <UsersTable rows={rows} />

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
            Página {page} de {pages} · {total} usuario(s)
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
