"use client";
import { useState } from "react";
import "@/styles/OrderTracking.scss";

interface TrackingEvent {
  occurred_at: string;
  status: {
    code: string;
    name: string;
    visible_name: string;
    substatus: string | null;
  };
}

interface TrackingResponse {
  available: boolean;
  status?: string;
  statusName?: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  history?: TrackingEvent[];
  error?: string;
}

// Spanish labels for Zipnova shipment status codes.
const STATUS_LABELS: Record<string, string> = {
  ready_to_ship: "Listo para despachar",
  shipped: "Despachado",
  in_transit_to_carrier: "En camino al transporte",
  received_by_carrier: "Recibido por el transporte",
  in_transit: "En tránsito",
  delivered: "Entregado",
  not_delivered: "No entregado",
  cancelled: "Cancelado"
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

interface OrderTrackingProps {
  orderId: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shipmentStatus: string | null;
}

export default function OrderTracking({
  orderId,
  trackingNumber,
  trackingUrl,
  shipmentStatus
}: OrderTrackingProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrackingResponse | null>(null);

  const handleToggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);

    if (!data) {
      setLoading(true);
      try {
        const res = await fetch(`/api/orders/${orderId}/tracking`);
        const json = (await res.json()) as TrackingResponse;
        setData(json);
      } catch {
        setData({ available: false, error: "Error al consultar el envío" });
      } finally {
        setLoading(false);
      }
    }
  };

  const currentLabel =
    data?.statusName ||
    (data?.status ? STATUS_LABELS[data.status] : null) ||
    (shipmentStatus ? STATUS_LABELS[shipmentStatus] : null) ||
    "Pendiente";

  return (
    <div className="order-tracking">
      <button
        type="button"
        className="tracking-toggle"
        onClick={handleToggle}
        aria-expanded={open}
      >
        <span>Seguir envío</span>
        <span className="tracking-status-badge">{currentLabel}</span>
        <span className="tracking-caret">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="tracking-panel">
          {loading && <p className="tracking-loading">Cargando...</p>}

          {!loading && data?.error && (
            <p className="tracking-error">{data.error}</p>
          )}

          {!loading && data && !data.available && (
            <p className="tracking-empty">
              El envío aún no fue despachado.
            </p>
          )}

          {!loading && data?.available && (
            <>
              <div className="tracking-detail">
                <span className="tracking-label">Número de seguimiento:</span>
                <span className="tracking-value">
                  {data.trackingNumber || trackingNumber || "—"}
                </span>
              </div>

              {(data.trackingUrl || trackingUrl) && (
                <a
                  href={(data.trackingUrl || trackingUrl) as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tracking-external-link"
                >
                  Seguir en el sitio del transporte ↗
                </a>
              )}

              {data.history && data.history.length > 0 ? (
                <ol className="tracking-timeline">
                  {data.history.map((event, idx) => (
                    <li key={idx} className="tracking-event">
                      <span className="tracking-event-dot" />
                      <div className="tracking-event-content">
                        <span className="tracking-event-name">
                          {event.status.visible_name ||
                            event.status.name ||
                            STATUS_LABELS[event.status.code] ||
                            event.status.code}
                        </span>
                        <span className="tracking-event-time">
                          {formatDateTime(event.occurred_at)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                !data.error && (
                  <p className="tracking-empty">
                    Sin eventos de seguimiento por ahora.
                  </p>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
