import prisma from "@/lib/prisma";
import ShipmentsAdmin from "@/components/admin/shipments/ShipmentsAdmin";
import type { AdminShipmentRow } from "@/types/admin";

export const metadata = {
  title: "Envíos",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function AdminShipmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = first(params.q).trim();

  const orders = await prisma.order.findMany({
    where: {
      archivedAt: null,
      shipmentId: { not: null },
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { user: { username: { contains: q, mode: "insensitive" } } },
              { trackingNumber: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { include: { address: true } },
    },
    take: 100,
  });

  const rows: AdminShipmentRow[] = orders.map((order) => {
    const selection = order.shippingSelection as
      | { serviceType?: string; logisticType?: string; shippingCost?: number }
      | null;

    return {
      orderId: order.id,
      orderStatus: order.status,
      createdAt: order.createdAt,
      total: order.total,
      shipmentId: order.shipmentId ?? "",
      shipmentStatus: order.shipmentStatus,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      liveStatus: null,
      userName: order.user.username,
      userEmail: order.user.email,
      destination: order.user.address
        ? `${order.user.address.city}, ${order.user.address.state}`
        : order.recipientName,
      shippingService: selection?.serviceType ?? null,
      shippingLogistic: selection?.logisticType ?? null,
      shippingCost: Number(selection?.shippingCost ?? 0) || null,
    };
  });

  return (
    <main className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1 className="admin-title">Envíos</h1>
      </div>

      <div className="admin-filter-bar">
        <form
          className="admin-filter-search"
          action="/admin/envios"
          method="get"
        >
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por pedido, cliente o tracking"
          />
          <button type="submit" className="admin-button small">
            Buscar
          </button>
        </form>
      </div>

      <ShipmentsAdmin rows={rows} />
    </main>
  );
}
