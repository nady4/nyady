import Link from "next/link";
import prisma from "@/lib/prisma";
import { num } from "@/lib/money";
import { fraunces } from "@/app/fonts";
import { formatARS, formatAdminDateTime } from "@/lib/admin/format";

export const metadata = {
  title: "Resumen",
};

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

function dayKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export default async function AdminOverviewPage() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
  const startOfWeek = new Date(startOfDay.getTime() - dayOfWeek * DAY_MS);

  const days30 = Array.from(
    { length: 30 },
    (_, i) => new Date(startOfDay.getTime() - (29 - i) * DAY_MS)
  );
  const since = days30[0] < startOfMonth ? days30[0] : startOfMonth;

  const [
    ordersSince,
    statusGroups,
    shippedCount,
    usersThisMonth,
    totalProducts,
    archivedProducts,
    approvedNoShipment,
    unverifiedUsers,
    recentOrders,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { total: true, status: true, createdAt: true },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.count({
      where: { status: "approved", shipmentId: { not: null } },
    }),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.product.count(),
    prisma.product.count({ where: { archivedAt: { not: null } } }),
    prisma.order.count({ where: { status: "approved", shipmentId: null } }),
    prisma.user.count({
      where: { emailVerified: null, archivedAt: null },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        shipmentId: true,
        dispatchedAt: true,
        user: { select: { username: true, email: true } },
      },
    }),
  ]);

  const monthOrders = ordersSince.filter((o) => o.createdAt >= startOfMonth);
  const monthApproved = monthOrders.filter((o) => o.status === "approved");
  const monthRevenue = monthApproved.reduce((acc, o) => acc + num(o.total), 0);
  const todayRevenue = ordersSince
    .filter((o) => o.status === "approved" && o.createdAt >= startOfDay)
    .reduce((acc, o) => acc + num(o.total), 0);
  const weekRevenue = ordersSince
    .filter((o) => o.status === "approved" && o.createdAt >= startOfWeek)
    .reduce((acc, o) => acc + num(o.total), 0);
  const averageTicket =
    monthApproved.length > 0 ? monthRevenue / monthApproved.length : 0;

  const statusCount = (status: string) =>
    statusGroups.find((g) => g.status === status)?._count._all ?? 0;
  const approvedTotal = statusCount("approved");
  const preparingCount = approvedTotal - shippedCount;

  // Sales series for the last 30 days (approved orders only).
  const revenueByDay = new Map<string, number>();
  for (const order of ordersSince) {
    if (order.status !== "approved") continue;
    const key = dayKey(order.createdAt);
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + num(order.total));
  }
  const series = days30.map((date) => ({
    date,
    value: revenueByDay.get(dayKey(date)) ?? 0,
  }));
  const maxRevenue = Math.max(...series.map((s) => s.value), 1);

  const kpis = [
    {
      label: "Ingresos del mes",
      value: formatARS(monthRevenue),
      sub: `Hoy ${formatARS(todayRevenue)} · Semana ${formatARS(weekRevenue)}`,
    },
    {
      label: "Pedidos del mes",
      value: String(monthOrders.length),
      sub: `${monthApproved.length} aprobados`,
    },
    {
      label: "Ticket promedio",
      value: formatARS(averageTicket),
      sub: "Sobre pedidos aprobados del mes",
    },
    {
      label: "Usuarios nuevos",
      value: String(usersThisMonth),
      sub: `${unverifiedUsers} sin verificar`,
    },
  ];

  const statusRows = [
    { label: "Pendiente", count: statusCount("pending"), badge: "status-pending" },
    {
      label: "En Preparación",
      count: preparingCount,
      badge: "status-pending",
    },
    { label: "En Envío", count: shippedCount, badge: "status-approved" },
    { label: "Rechazada", count: statusCount("rejected"), badge: "status-rejected" },
    { label: "Cancelada", count: statusCount("cancelled"), badge: "status-cancelled" },
  ];

  const alerts = [
    {
      label: "Pedidos aprobados sin envío",
      count: approvedNoShipment,
      href: "/admin/pedidos",
      cta: "Gestionar",
    },
    {
      label: "Usuarios sin verificar email",
      count: unverifiedUsers,
      href: "/admin/usuarios?verified=no",
      cta: "Ver usuarios",
    },
    {
      label: "Productos archivados",
      count: archivedProducts,
      href: "/admin/productos?archived=1",
      cta: "Ver catálogo",
    },
  ];

  return (
    <div className="admin-dashboard">
      <h1 className={`admin-dashboard-title ${fraunces.className}`}>Resumen</h1>

      <div className="admin-kpis">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="admin-kpi">
            <span className="admin-kpi-label">{kpi.label}</span>
            <span className="admin-kpi-value">{kpi.value}</span>
            <span className="admin-kpi-sub">{kpi.sub}</span>
          </div>
        ))}
      </div>

      <div className="admin-dashboard-grid">
        <div className="admin-dashboard-col">
          <div className="admin-card">
            <h2 className="admin-card-title">Ventas de los últimos 30 días</h2>
            <div className="admin-chart-bars">
              {series.map((point) => (
                <div
                  key={dayKey(point.date)}
                  className={`admin-chart-bar ${point.value === 0 ? "empty" : ""}`}
                  style={{ height: `${Math.max((point.value / maxRevenue) * 100, 1.5)}%` }}
                  title={`${formatAdminDateTime(point.date).slice(0, 10)} · ${formatARS(point.value)}`}
                />
              ))}
            </div>
            <div className="admin-chart-axis">
              <span>hace 30 días</span>
              <span>hoy</span>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Últimos pedidos</h2>
              <Link href="/admin/pedidos" className="admin-card-link">
                Ver todos
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="admin-empty">Todavía no hay pedidos</p>
            ) : (
              <div className="admin-recent-list">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/pedidos/${order.id}`}
                    className="admin-recent-row"
                  >
                    <span className="admin-recent-main">
                      <span className="admin-recent-id">
                        Pedido #{order.id.slice(0, 8)}
                      </span>
                      <span className="admin-recent-client">
                        {order.user.username} ·{" "}
                        {formatAdminDateTime(order.createdAt)}
                      </span>
                    </span>
                    <span className="admin-recent-right">
                      <span className="admin-recent-total">
                        {formatARS(num(order.total))}
                      </span>
                      <span
                        className={`admin-status-badge status-${order.status}`}
                      >
                        {order.status === "approved"
                          ? order.shipmentId || order.dispatchedAt
                            ? "En Envío"
                            : "En Preparación"
                          : STATUS_LABELS[order.status] || order.status}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="admin-dashboard-col">
          <div className="admin-card">
            <h2 className="admin-card-title">Pedidos por estado</h2>
            <div className="admin-status-list">
              {statusRows.map((row) => (
                <div key={row.label} className="admin-status-row">
                  <span
                    className={`admin-status-badge ${row.badge}`}
                  >
                    {row.label}
                  </span>
                  <strong>{row.count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-card">
            <h2 className="admin-card-title">Pendientes</h2>
            <div className="admin-alert-list">
              {alerts.map((alert) => (
                <div key={alert.label} className="admin-alert-row">
                  <span>
                    {alert.label}
                    {alert.count > 0 && (
                      <strong className="admin-alert-count">
                        {" "}
                        ({alert.count})
                      </strong>
                    )}
                  </span>
                  {alert.count > 0 ? (
                    <Link href={alert.href}>{alert.cta}</Link>
                  ) : (
                    <span className="admin-alert-ok">Al día</span>
                  )}
                </div>
              ))}
              <div className="admin-alert-row">
                <span>Productos activos</span>
                <strong>{totalProducts - archivedProducts}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
