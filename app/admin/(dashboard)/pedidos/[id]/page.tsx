import { notFound } from "next/navigation";
import Link from "next/link";
import { num } from "@/lib/money";
import prisma from "@/lib/prisma";
import OrderStatusEditor from "@/components/admin/orders/OrderStatusEditor";
import OrderDetailsEditor from "@/components/admin/orders/OrderDetailsEditor";
import OrderItemsEditor from "@/components/admin/orders/OrderItemsEditor";
import {
  getShipmentStatus,
  getShipmentTracking,
  hasZipnovaCredentials,
} from "@/actions/shipping";
import type { ShippingSelection } from "@/actions/shipping";
import { getColorSwatchStyle } from "@/lib/colors";
import { fraunces } from "@/app/fonts";
import { formatARS, formatAdminDateTime } from "@/lib/admin/format";
import { shipmentStatusLabel } from "@/lib/order-status";

export const metadata = {
  title: "Pedido",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

interface TrackingEvent {
  occurred_at: string;
  status: { code: string; name: string; visible_name: string | null };
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { include: { address: true } },
      orderItems: { include: { product: true } },
    },
  });

  if (!order) notFound();

  const selection =
    (order.shippingSelection as ShippingSelection | null) ?? null;

  // Live Zipnova data only in the detail view: cheap (one order) and keeps
  // the list page fast.
  const zipnovaConfigured = await hasZipnovaCredentials();
  let liveStatus: string | null = null;
  let trackingEvents: TrackingEvent[] = [];
  if (order.shipmentId && zipnovaConfigured) {
    const [fresh, tracking] = await Promise.all([
      getShipmentStatus(order.shipmentId),
      getShipmentTracking(order.shipmentId),
    ]);
    liveStatus = fresh?.status ?? null;
    trackingEvents = tracking?.data ?? [];
  }

  const subtotal = order.orderItems.reduce(
    (acc, item) =>
      acc +
      num(item.unitPrice ?? item.product?.price ?? 0) * item.quantity,
    0
  );
  const shippingCost = Math.max(0, Number(selection?.shippingCost ?? 0));
  const totalNum = num(order.total);
  const impliedDiscount =
    num(order.discountAmount) > 0
      ? num(order.discountAmount)
      : Math.max(0, subtotal + shippingCost - totalNum);

  // Product catalog for the pending-orders item editor (orderItemsEditor).
  const productOptions = order.status === "pending"
    ? (await prisma.product.findMany({
        where: { archivedAt: null, available: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          price: true,
          photo: true,
          colors: true,
          sizes: true,
          tacoOptions: true,
        },
      })).map((product) => ({
        ...product,
        price: num(product.price),
        colors: [...product.colors],
        sizes: [...product.sizes],
        tacoOptions: [...product.tacoOptions],
      }))
    : [];

  return (
    <main className="admin-page admin-page-wide admin-order-detail">
      <div className="admin-page-header">
        <h1 className={`admin-title ${fraunces.className}`}>
          Pedido #{order.id.slice(0, 8)}
        </h1>
        <Link href="/admin/pedidos" className="admin-button">
          Volver
        </Link>
      </div>

      <div className="admin-order-detail-status">
        <OrderStatusEditor
          orderId={order.id}
          status={order.status}
          archivedAt={order.archivedAt}
          hasShipment={Boolean(order.shipmentId)}
          hasShippingData={Boolean(
            order.recipientName && order.user.address && order.user.email
          )}
          dispatchedAt={order.dispatchedAt}
        />
        <span className="admin-order-detail-meta">
          {formatAdminDateTime(order.createdAt)} ·{" "}
          {order.source === "manual" ? "Pedido manual" : "Compra web"}
          {order.archivedAt ? " · Archivado" : ""}
          {liveStatus ? ` · Zipnova: ${shipmentStatusLabel(liveStatus)}` : ""}
        </span>
      </div>

      <div className="admin-order-detail-grid">
        <div className="admin-order-detail-col">
          <div className="admin-card">
            <h2 className="admin-card-title">Items</h2>
            <div className="admin-order-detail-items">
              {order.orderItems.map((item) => {
                const photo =
                  item.productPhoto || item.product?.photo || "";
                const name = item.productName || item.product?.name || "—";
                const price = item.unitPrice ?? item.product?.price ?? 0;
                return (
                  <div key={item.id} className="admin-order-detail-item">
                    {photo && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={photo}
                        alt={name}
                        width={52}
                        height={52}
                        className="admin-order-detail-thumb"
                      />
                    )}
                    <div className="admin-order-detail-item-info">
                      <span className="admin-order-detail-item-name">{name}</span>
                      <span className="admin-cell-sub">
                        {[
                          item.selectedColor ? (
                            <span key="c" className="admin-order-item-color-wrap">
                              <span
                                className="admin-order-item-color"
                                style={getColorSwatchStyle(item.selectedColor)}
                                title={item.selectedColor}
                              />
                              {item.selectedColor}
                            </span>
                          ) : null,
                          item.selectedSize,
                          item.selectedTacoOption && `Taco: ${item.selectedTacoOption}`,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Sin variante"}
                      </span>
                    </div>
                    <span className="admin-order-detail-item-qty">
                      {item.quantity} × {formatARS(price)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="admin-order-detail-totals">
              <div className="admin-order-detail-total-row">
                <span>Subtotal productos</span>
                <span>{formatARS(subtotal)}</span>
              </div>
              {impliedDiscount > 0 && (
                <div className="admin-order-detail-total-row">
                  <span>
                    Descuento
                    {order.couponCode ? ` (cupón ${order.couponCode})` : ""}
                  </span>
                  <span>−{formatARS(impliedDiscount)}</span>
                </div>
              )}
              {shippingCost > 0 && (
                <div className="admin-order-detail-total-row">
                  <span>
                    Envío
                    {selection?.serviceType === "manual"
                      ? " (costo manual)"
                      : ""}
                  </span>
                  <span>{formatARS(shippingCost)}</span>
                </div>
              )}
              <div className="admin-order-detail-total-row strong">
                <span>Total</span>
                <span>{formatARS(totalNum)}</span>
              </div>
            </div>
          </div>

          {order.status === "pending" && productOptions.length > 0 && (
            <div className="admin-card">
              <h2 className="admin-card-title">Editar items (pedido pendiente)</h2>
              <OrderItemsEditor
                orderId={order.id}
                items={order.orderItems.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  selectedColor: item.selectedColor,
                  selectedSize: item.selectedSize,
                  selectedTacoOption: item.selectedTacoOption,
                }))}
                productOptions={productOptions}
              />
            </div>
          )}
        </div>

        <div className="admin-order-detail-col">
          <div className="admin-card">
            <h2 className="admin-card-title">Cliente</h2>
            <div className="admin-order-detail-lines">
              <span>
                <strong>{order.user.username}</strong> · {order.user.email}
              </span>
              {order.user.address ? (
                <span>
                  Dirección: {order.user.address.street},{" "}
                  {order.user.address.city}, {order.user.address.state} (
                  {order.user.address.postalCode})
                </span>
              ) : (
                <span>Dirección: sin cargar</span>
              )}
              {order.recipientName && (
                <span>Destinatario: {order.recipientName}</span>
              )}
              {order.recipientDocument && (
                <span>Documento: {order.recipientDocument}</span>
              )}
              {order.recipientPhone && (
                <span>Teléfono: {order.recipientPhone}</span>
              )}
            </div>
          </div>

          <div className="admin-card">
            <h2 className="admin-card-title">Envío</h2>
            <div className="admin-order-detail-lines">
              {order.shipmentId ? (
                <>
                  <span>Zipnova shipment: {order.shipmentId}</span>
                  <span>
                    Estado:{" "}
                    {shipmentStatusLabel(
                      liveStatus ?? order.shipmentStatus
                    ) ?? "—"}
                  </span>
                  {order.trackingNumber && (
                    <span>Tracking: {order.trackingNumber}</span>
                  )}
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-tracking-link"
                    >
                      Seguir en el transporte ↗
                    </a>
                  )}
                </>
              ) : selection?.serviceType ? (
                <>
                  <span>Opción: {selection.serviceType}</span>
                  {selection.logisticType && (
                    <span>Tipo: {selection.logisticType}</span>
                  )}
                </>
              ) : (
                <span>Sin opción de envío registrada</span>
              )}
            </div>

            {trackingEvents.length > 0 && (
              <ol className="admin-tracking-timeline">
                {trackingEvents.map((event, index) => (
                  <li key={index} className="admin-tracking-event">
                    <span className="admin-tracking-event-dot" />
                    <div className="admin-tracking-event-content">
                      <span className="admin-tracking-event-name">
                        {event.status.visible_name ||
                          event.status.name ||
                          shipmentStatusLabel(event.status.code) ||
                          event.status.code}
                      </span>
                      <span className="admin-tracking-event-time">
                        {formatAdminDateTime(event.occurred_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="admin-card">
            <h2 className="admin-card-title">Datos y notas</h2>
            <OrderDetailsEditor
              order={{
                id: order.id,
                status: order.status,
                total: totalNum,
                source: order.source,
                createdAt: order.createdAt,
                archivedAt: order.archivedAt,
                notes: order.notes,
                recipientName: order.recipientName,
                recipientDocument: order.recipientDocument,
                recipientPhone: order.recipientPhone,
                couponCode: order.couponCode,
                discountAmount: num(order.discountAmount),
                shippingCost,
                shippingService: selection?.serviceType ?? null,
                shippingLogistic: selection?.logisticType ?? null,
                shipmentId: order.shipmentId,
                trackingNumber: order.trackingNumber,
                trackingUrl: order.trackingUrl,
                shipmentStatus: order.shipmentStatus,
                user: {
                  id: order.user.id,
                  username: order.user.username,
                  email: order.user.email,
                  address: order.user.address
                    ? {
                        street: order.user.address.street,
                        city: order.user.address.city,
                        state: order.user.address.state,
                        postalCode: order.user.address.postalCode,
                      }
                    : null,
                },
                items: [],
                trackingEvents: [],
                liveStatus: null,
                userUsername: order.user.username,
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
