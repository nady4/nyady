import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { num } from "@/lib/money";
import { fraunces } from "@/app/fonts";
import UserFormAdmin from "@/components/admin/users/UserFormAdmin";
import UserSecurityPanel from "@/components/admin/users/UserSecurityPanel";
import { formatAdminDate, formatAdminDateTime, formatARS } from "@/lib/admin/format";
import { orderStatusLabel } from "@/lib/order-status";
import type { AdminUserDetailView } from "@/types/admin";

export const metadata = {
  title: "Usuario",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      address: { select: { street: true, city: true, state: true, postalCode: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          total: true,
          createdAt: true,
          couponCode: true,
          shipmentId: true,
        },
      },
      _count: { select: { orders: true, cart: true, wishlist: true } },
    },
  });

  if (!user) notFound();

  const view: AdminUserDetailView = {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    archivedAt: user.archivedAt,
    emailVerified: user.emailVerified,
    termsAcceptedAt: user.termsAcceptedAt,
    termsVersion: user.termsVersion,
    address: user.address ?? null,
    counts: {
      orders: user._count.orders,
      carts: user._count.cart,
      wishLists: user._count.wishlist,
    },
    orders: user.orders.map((o) => ({ ...o, total: num(o.total) })),
  };

  return (
    <main className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <div className="admin-user-head">
          <span className={`admin-user-avatar ${fraunces.className}`}>
            {user.username.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h1 className={`admin-title ${fraunces.className}`}>{user.username}</h1>
            <span className="admin-user-head-email">{user.email}</span>
          </div>
        </div>
        <Link href="/admin/usuarios" className="admin-button">
          Volver
        </Link>
      </div>

      <div className="admin-user-detail-stats">
        <span>{view.counts.orders} pedidos</span>
        <span>{formatAdminDate(view.createdAt)} de alta</span>
        <span>
          {view.emailVerified
            ? `Verificada el ${formatAdminDate(view.emailVerified)}`
            : "Sin verificar"}
        </span>
        {view.archivedAt && <strong className="admin-user-archived">Cuenta archivada</strong>}
      </div>

      <div className="admin-user-detail-grid">
        <div className="admin-user-detail-col">
          <div className="admin-card">
            <h2 className="admin-card-title">Perfil</h2>
            <UserFormAdmin user={view} />
          </div>
        </div>

        <div className="admin-user-detail-col">
          <div className="admin-card">
            <h2 className="admin-card-title">Cuenta</h2>
            <UserSecurityPanel user={view} />
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">
                Últimos pedidos {view.orders.length < view.counts.orders && `(${view.orders.length} de ${view.counts.orders})`}
              </h2>
              <Link href={`/admin/pedidos?q=${encodeURIComponent(user.email)}`} className="admin-card-link">
                Ver todos en Pedidos
              </Link>
            </div>

            {view.orders.length === 0 ? (
              <p className="admin-empty">Sin pedidos todavía</p>
            ) : (
              <div className="admin-recent-list">
                {view.orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/pedidos/${order.id}`}
                    className="admin-recent-row"
                  >
                    <span className="admin-recent-main">
                      <span className="admin-recent-id">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span className="admin-recent-client">
                        {formatAdminDateTime(order.createdAt)}
                        {order.couponCode ? ` · ${order.couponCode}` : ""}
                      </span>
                    </span>
                    <span className="admin-recent-right">
                      <span className="admin-recent-total">
                        {formatARS(order.total)}
                      </span>
                      <span className={`admin-status-badge status-${order.status}`}>
                        {orderStatusLabel(order)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
