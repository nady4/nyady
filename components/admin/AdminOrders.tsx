"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fraunces } from "@/app/fonts";
import { getColorHex } from "@/lib/colors";
import { shipOrderAction } from "@/actions/admin";

interface AdminOrderItem {
  id: string;
  quantity: number;
  selectedColor: string | null;
  product: { name: string; photo: string; price: number };
}

interface AdminOrderUser {
  username: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
}

interface AdminOrder {
  id: string;
  status: string;
  total: number;
  createdAt: Date;
  recipientName: string | null;
  recipientDocument: string | null;
  recipientPhone: string | null;
  couponCode: string | null;
  discountAmount: number;
  shipmentId: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shipmentStatus: string | null;
  shippingSelection: unknown;
  user: AdminOrderUser;
  orderItems: AdminOrderItem[];
}

interface TrackingEvent {
  occurred_at: string;
  status: { code: string; name: string; visible_name: string | null };
}

interface AdminOrderWithTracking {
  order: AdminOrder;
  shipmentStatus: string | null;
  tracking: { data: TrackingEvent[] } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

// Zipnova shipment status codes → Spanish.
const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  ready_to_ship: "Listo para despachar",
  shipped: "Despachado",
  in_transit_to_carrier: "En camino al transporte",
  received_by_carrier: "Recibido por el transporte",
  in_transit: "En tránsito",
  delivered: "Entregado",
  not_delivered: "No entregado",
  cancelled: "Cancelado",
};

const SHIP_ERROR_LABELS: Record<string, string> = {
  "Order is not approved": "El pedido aún no está aprobado",
  "Zipnova rejected the shipment creation":
    "Zipnova rechazó la creación del envío",
};

function orderStatusLabel(order: AdminOrder): string {
  if (order.status === "approved") {
    return order.shipmentId ? "En Envío" : "En Preparación";
  }
  return STATUS_LABELS[order.status] || order.status;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function shippingErrorLabel(error?: string): string | undefined {
  if (!error) return undefined;
  return SHIP_ERROR_LABELS[error] || error;
}

function AdminOrderCard({
  entry,
  onShipped,
}: {
  entry: AdminOrderWithTracking;
  onShipped: (orderId: string) => void;
}) {
  const { order } = entry;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const canShip = order.status === "approved" && !order.shipmentId;

  const handleShip = async () => {
    if (
      !window.confirm(
        `¿Crear el envío en Zipnova para el pedido #${order.id.slice(0, 8)}?\nEl pedido pasará de "En Preparación" a "En Envío".`
      )
    ) {      return;
    }

    setError(null);
    setPending(true);
    try {
      const result = await shipOrderAction(order.id);
      if (!result.ok) {
        setError(shippingErrorLabel(result.error) || "Error al crear el envío");
      } else {
        onShipped(order.id);
      }
    } catch {
      setError("Error al crear el envío");
    } finally {
      setPending(false);
    }
  };

  const shipmentLabel = entry.shipmentStatus
    ? SHIPMENT_STATUS_LABELS[entry.shipmentStatus] || entry.shipmentStatus
    : order.shipmentStatus
      ? SHIPMENT_STATUS_LABELS[order.shipmentStatus] || order.shipmentStatus
      : null;

  return (
    <div className="admin-order-card">
      <div className="admin-order-header">
        <div>
          <h3 className={`admin-order-id ${fraunces.className}`}>
            Pedido #{order.id.slice(0, 8)}
          </h3>
          <span className="admin-order-date">
            {order.createdAt.toLocaleString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <span className={`admin-status-badge status-${order.status}`}>
          {orderStatusLabel(order)}
        </span>
      </div>

      <div className="admin-order-meta">
        <span>
          Cliente: {order.user.username} ({order.user.email})
        </span>
        {order.recipientName && (
          <span>Destinatario: {order.recipientName}</span>
        )}
        {order.user.address && (
          <span>
            Dirección: {order.user.address.street}, {order.user.address.city},{" "}
            {order.user.address.state} ({order.user.address.postalCode})
          </span>
        )}
        {order.couponCode && (
          <span>
            Cupón: {order.couponCode} (−$
            {order.discountAmount.toLocaleString("es-AR")})
          </span>
        )}
        {order.trackingNumber && (
          <span>Seguimiento: {order.trackingNumber}</span>
        )}
      </div>

      <div className="admin-order-items">
        {order.orderItems.map((item) => (
          <div key={item.id} className="admin-order-item">
            <span className="admin-order-item-name">
              {item.product.name}
              {item.selectedColor && (
                <span
                  className="admin-order-item-color"
                  style={{ backgroundColor: getColorHex(item.selectedColor) }}
                  title={item.selectedColor}
                />
              )}
            </span>
            <span className="admin-order-item-qty">
              Cantidad: {item.quantity}
            </span>
            <span className="admin-order-item-subtotal">
              ${(item.product.price * item.quantity).toLocaleString("es-AR")}
            </span>
          </div>
        ))}
      </div>

      <div className="admin-order-total">
        Total: <strong>${order.total.toLocaleString("es-AR")}</strong>
      </div>

      {canShip && (
        <div className="admin-order-ship">
          {error && <p className="admin-error">{error}</p>}
          <button
            type="button"
            className="admin-button primary admin-ship-button"
            onClick={handleShip}
            disabled={pending}
          >
            {pending ? "Creando envío..." : "Pasar a envío (Zipnova)"}
          </button>
          <p className="admin-order-ship-hint">
            Crea el envío en Zipnova: el pedido pasa de «En Preparación» a
            «En Envío» y queda a cargo del transporte.
          </p>
        </div>
      )}

      {order.shipmentId && (
        <div className="admin-order-tracking">
          {shipmentLabel && (
            <span
              className={`admin-status-badge ${
                order.status === "approved" ? "status-approved" : ""
              }`}
            >
              Envío: {shipmentLabel}
            </span>
          )}
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-tracking-link"
            >
              Seguir en el sitio del transporte ↗
            </a>
          )}
          {entry.tracking?.data && entry.tracking.data.length > 0 && (
            <ol className="admin-tracking-timeline">
              {entry.tracking.data.map((event, idx) => (
                <li key={idx} className="admin-tracking-event">
                  <span className="admin-tracking-event-dot" />
                  <div className="admin-tracking-event-content">
                    <span className="admin-tracking-event-name">
                      {event.status.visible_name ||
                        event.status.name ||
                        SHIPMENT_STATUS_LABELS[event.status.code] ||
                        event.status.code}
                    </span>
                    <span className="admin-tracking-event-time">
                      {formatDateTime(event.occurred_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminOrders({
  orders,
}: {
  orders: AdminOrderWithTracking[];
}) {
  const router = useRouter();

  if (orders.length === 0) {
    return <p className="admin-empty">No hay pedidos todavía</p>;
  }

  return (
    <div className="admin-orders-list">
      {orders.map((entry) => (
        <AdminOrderCard
          key={entry.order.id}
          entry={entry}
          onShipped={() => router.refresh()}
        />
      ))}
    </div>
  );
}
