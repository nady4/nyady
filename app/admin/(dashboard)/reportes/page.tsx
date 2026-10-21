import prisma from "@/lib/prisma";
import { fraunces } from "@/app/fonts";
import { formatARS } from "@/lib/admin/format";
import { getStoreWholesaleTiers } from "@/lib/store-settings";

export const metadata = {
  title: "Reportes",
};

const DAY_MS = 24 * 60 * 60 * 1000;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function dayKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  const s = startOfDay(d);
  return new Date(s.getTime() + DAY_MS - 1);
}

function buildRange(params: Record<string, string | string[] | undefined>) {
  const today = startOfDay(new Date());
  const preset = first(params.preset);
  const fromRaw = first(params.from);
  const toRaw = first(params.to);

  let from: Date;
  let to: Date;

  if (preset === "7" || preset === "30" || preset === "90") {
    const days = Number(preset);
    to = endOfDay(today);
    from = new Date(today.getTime() - (days - 1) * DAY_MS);
  } else if (preset === "month") {
    from = new Date(today.getFullYear(), today.getMonth(), 1);
    to = endOfDay(today);
  } else if (fromRaw || toRaw) {
    const parsedFrom = fromRaw ? new Date(`${fromRaw}T00:00:00`) : null;
    const parsedTo = toRaw ? new Date(`${toRaw}T00:00:00`) : null;
    from = parsedFrom && !Number.isNaN(parsedFrom.getTime())
      ? startOfDay(parsedFrom)
      : new Date(today.getTime() - 29 * DAY_MS);
    to = parsedTo && !Number.isNaN(parsedTo.getTime())
      ? endOfDay(parsedTo)
      : endOfDay(today);
    if (to > endOfDay(today)) to = endOfDay(today);
    if (from > to) from = to;
  } else {
    to = endOfDay(today);
    from = new Date(today.getTime() - 29 * DAY_MS);
  }

  const spanDays = Math.max(
    1,
    Math.round((endOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS) + 1
  );
  const prevFrom = new Date(startOfDay(from).getTime() - spanDays * DAY_MS);
  const prevTo = new Date(startOfDay(from).getTime() - 1);

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from, to, prevFrom, prevTo, fromISO: iso(from), toISO: iso(to) };
}

function pct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

function Delta({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="admin-delta new">nuevo</span>;
  }
  const rounded = Math.round(value);
  if (rounded === 0) {
    return <span className="admin-delta flat">=</span>;
  }
  return (
    <span className={`admin-delta ${rounded > 0 ? "up" : "down"}`}>
      {rounded > 0 ? "▲" : "▼"} {Math.abs(rounded)}%
    </span>
  );
}

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { from, to, prevFrom, prevTo, fromISO, toISO } = buildRange(params);
  const wholesaleTiers = await getStoreWholesaleTiers();

  const [orders, previous] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: "approved",
        createdAt: { gte: from, lte: to },
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
        orderItems: {
          select: {
            quantity: true,
            unitPrice: true,
            productName: true,
            product: { select: { category: true } },
          },
        },
      },
    }),
    prisma.order.aggregate({
      where: {
        status: "approved",
        createdAt: { gte: prevFrom, lte: prevTo },
      },
      _sum: { total: true },
      _count: { _all: true },
    }),
  ]);

  const revenue = orders.reduce((acc, order) => acc + order.total, 0);
  const unitsSold = orders.reduce(
    (acc, order) =>
      acc + order.orderItems.reduce((a, item) => a + item.quantity, 0),
    0
  );
  const averageTicket = orders.length > 0 ? revenue / orders.length : 0;

  const prevRevenue = previous._sum.total ?? 0;
  const prevCount = previous._count._all;
  const prevTicket = prevCount > 0 ? prevRevenue / prevCount : 0;

  // Daily series
  const revenueByDay = new Map<string, number>();
  for (const order of orders) {
    const key = dayKey(order.createdAt);
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + order.total);
  }
  const daysCount = Math.min(
    120,
    Math.round((endOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS) + 1
  );
  const series = Array.from({ length: daysCount }, (_, i) => {
    const date = new Date(startOfDay(from).getTime() + i * DAY_MS);
    return { date, value: revenueByDay.get(dayKey(date)) ?? 0 };
  });
  const maxRevenue = Math.max(...series.map((s) => s.value), 1);

  // Top products (snapshot-aware)
  const productMap = new Map<
    string,
    { name: string; category: string; units: number; revenue: number }
  >();
  for (const order of orders) {
    for (const item of order.orderItems) {
      const key = item.productName || "—";
      const entry = productMap.get(key) ?? {
        name: key,
        category: item.product?.category ?? "—",
        units: 0,
        revenue: 0,
      };
      entry.units += item.quantity;
      entry.revenue += (item.unitPrice ?? 0) * item.quantity;
      productMap.set(key, entry);
    }
  }
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Categories
  const categoryMap = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.orderItems) {
      const category = item.product?.category ?? "—";
      categoryMap.set(
        category,
        (categoryMap.get(category) ?? 0) + (item.unitPrice ?? 0) * item.quantity
      );
    }
  }
  const categoriesTotal = [...categoryMap.values()].reduce((a, b) => a + b, 0) || 1;
  const topCategories = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Best customers
  const customerMap = new Map<
    string,
    { name: string; email: string; total: number; orders: number }
  >();
  for (const order of orders) {
    const entry = customerMap.get(order.user.id) ?? {
      name: order.user.username,
      email: order.user.email,
      total: 0,
      orders: 0,
    };
    entry.total += order.total;
    entry.orders += 1;
    customerMap.set(order.user.id, entry);
  }
  const topCustomers = [...customerMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Coupon usage
  const couponMap = new Map<string, { count: number; discount: number }>();
  for (const order of orders) {
    if (!order.couponCode) continue;
    const entry = couponMap.get(order.couponCode) ?? { count: 0, discount: 0 };
    entry.count += 1;
    entry.discount += order.discountAmount;
    couponMap.set(order.couponCode, entry);
  }
  const couponRows = [...couponMap.entries()].sort((a, b) => b[1].count - a[1].count);

  const exportQuery = new URLSearchParams({
    from: fromISO,
    to: toISO,
  }).toString();

  const kpis = [
    {
      label: "Ingresos",
      value: formatARS(revenue),
      delta: pct(revenue, prevRevenue),
      sub: `Período previo: ${formatARS(prevRevenue)}`,
    },
    {
      label: "Pedidos",
      value: String(orders.length),
      delta: pct(orders.length, prevCount),
      sub: `Período previo: ${prevCount}`,
    },
    {
      label: "Ticket promedio",
      value: formatARS(averageTicket),
      delta: pct(averageTicket, prevTicket),
      sub: `Período previo: ${formatARS(prevTicket)}`,
    },
    {
      label: "Unidades vendidas",
      value: String(unitsSold),
      delta: null,
      sub: wholesaleTiers.length > 0
        ? `${wholesaleTiers[0].label} desde ${wholesaleTiers[0].units} u.`
        : "Sin descuentos por cantidad",
    },
  ];

  return (
    <main className="admin-page admin-page-wide admin-reports">
      <div className="admin-page-header">
        <h1 className="admin-title">Reportes</h1>
        <a href={`/api/admin/export/products`} className="admin-button" download>
          Exportar catálogo CSV
        </a>
      </div>

      <div className="admin-report-filters">
        <div className="admin-report-presets">
          <a href={`/admin/reportes?preset=7`} className={`admin-button small ${fromISO === new Date(new Date().getTime() - 6 * DAY_MS).toISOString().slice(0, 10) ? "active" : ""}`}>
            7 días
          </a>
          <a href="/admin/reportes?preset=30" className="admin-button small">
            30 días
          </a>
          <a href="/admin/reportes?preset=90" className="admin-button small">
            90 días
          </a>
          <a href="/admin/reportes?preset=month" className="admin-button small">
            Este mes
          </a>
          <a href={`/api/admin/export/orders?${exportQuery}`} className="admin-button small" download>
            Exportar período CSV
          </a>
        </div>

        <form className="admin-report-custom" action="/admin/reportes" method="get">
          <label>
            <span>Desde</span>
            <input type="date" name="from" defaultValue={fromISO} />
          </label>
          <label>
            <span>Hasta</span>
            <input type="date" name="to" defaultValue={toISO} />
          </label>
          <button type="submit" className="admin-button small">
            Aplicar
          </button>
        </form>
      </div>

      <div className="admin-kpis">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="admin-kpi">
            <span className="admin-kpi-label">{kpi.label}</span>
            <span className="admin-kpi-value">
              {kpi.value}{" "}
              {kpi.delta !== null && <Delta value={kpi.delta} />}
            </span>
            <span className="admin-kpi-sub">{kpi.sub}</span>
          </div>
        ))}
      </div>

      <div className="admin-report-grid">
        <div className="admin-card">
          <h2 className={`admin-card-title ${fraunces.className}`}>
            Ventas por día ({fromISO} → {toISO})
          </h2>
          <div className="admin-chart-bars">
            {series.map((point) => (
              <div
                key={dayKey(point.date)}
                className={`admin-chart-bar ${point.value === 0 ? "empty" : ""}`}
                style={{ height: `${Math.max((point.value / maxRevenue) * 100, 1.5)}%` }}
                title={`${dayKey(point.date)} · ${formatARS(point.value)}`}
              />
            ))}
          </div>
          <div className="admin-chart-axis">
            <span>{fromISO}</span>
            <span>{toISO}</span>
          </div>
        </div>

        <div className="admin-card">
          <h2 className="admin-card-title">Por categoría</h2>
          {topCategories.length === 0 ? (
            <p className="admin-empty">Sin ventas en el período</p>
          ) : (
            <div className="admin-category-bars">
              {topCategories.map(([category, total]) => (
                <div key={category} className="admin-category-bar-row">
                  <span className="admin-category-bar-name">{category}</span>
                  <span className="admin-category-bar-track">
                    <span
                      className="admin-category-bar-fill"
                      style={{ width: `${(total / categoriesTotal) * 100}%` }}
                    />
                  </span>
                  <span className="admin-category-bar-value">
                    {formatARS(total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="admin-report-grid admin-report-grid-2">
        <div className="admin-card">
          <h2 className="admin-card-title">Top productos</h2>
          {topProducts.length === 0 ? (
            <p className="admin-empty">Sin ventas en el período</p>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th className="admin-col-number">Un.</th>
                    <th className="admin-col-number">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product) => (
                    <tr key={product.name}>
                      <td className="admin-cell-title">{product.name}</td>
                      <td className="admin-cell-sub">{product.category}</td>
                      <td className="admin-col-number">{product.units}</td>
                      <td className="admin-cell-price">
                        {formatARS(product.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-card">
          <h2 className="admin-card-title">Mejores clientes</h2>
          {topCustomers.length === 0 ? (
            <p className="admin-empty">Sin ventas en el período</p>
          ) : (
            <div className="admin-recent-list">
              {topCustomers.map((customer) => (
                <div key={customer.email} className="admin-report-customer-row">
                  <span className="admin-recent-main">
                    <span className="admin-recent-id">{customer.name}</span>
                    <span className="admin-recent-client">{customer.email}</span>
                  </span>
                  <span className="admin-report-customer-right">
                    <span className="admin-report-customer-count">
                      {customer.orders} pedido(s)
                    </span>
                    <span className="admin-recent-total">
                      {formatARS(customer.total)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">Cupones usados</h2>
        {couponRows.length === 0 ? (
          <p className="admin-empty">No se usaron cupones en el período</p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cupón</th>
                  <th className="admin-col-number">Pedidos</th>
                  <th className="admin-col-number">Descuento total</th>
                </tr>
              </thead>
              <tbody>
                {couponRows.map(([code, data]) => (
                  <tr key={code}>
                    <td className="admin-cell-title">{code}</td>
                    <td className="admin-col-number">{data.count}</td>
                    <td className="admin-cell-price">
                      −{formatARS(data.discount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
