import prisma from "@/lib/prisma";
import {
  getShipmentStatus,
  getShipmentTracking,
  hasZipnovaCredentials,
  ShipmentTrackingHistory,
} from "@/actions/shipping";
import AdminOrders from "@/components/admin/AdminOrders";

export const metadata = {
  title: "Pedidos",
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          username: true,
          email: true,
          address: { select: { street: true, city: true, state: true, postalCode: true } },
        },
      },
      orderItems: {
        include: {
          product: { select: { name: true, photo: true, price: true } },
        },
      },
    },
  });

  // Refresh each shipped order's Zipnova status (GET /shipments/{id}) and
  // tracking history (GET /shipments/{id}/tracking) at page load so the
  // admin view is current. Best-effort: any failure falls back to the data
  // persisted on the order by the webhook. Skipped entirely while the
  // ZIPNOVA_* env vars are still the placeholder values (every call would
  // 403 with "Invalid combination of api key and secret").
  const zipnovaConfigured = await hasZipnovaCredentials();

  const ordersWithTracking = await Promise.all(
    orders.map(async (order) => {
      if (!order.shipmentId || !zipnovaConfigured) {
        return { order, shipmentStatus: null, tracking: null };
      }

      const [freshStatus, tracking] = await Promise.all([
        getShipmentStatus(order.shipmentId),
        getShipmentTracking(order.shipmentId),
      ]);

      return {
        order,
        shipmentStatus: freshStatus?.status ?? null,
        tracking: tracking as ShipmentTrackingHistory | null,
      };
    })
  );

  return (
    <main className="admin-page admin-page-wide">
      <h1 className="admin-title">Pedidos</h1>
      <AdminOrders orders={ordersWithTracking} />
    </main>
  );
}
