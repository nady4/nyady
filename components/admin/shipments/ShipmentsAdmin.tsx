"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { refreshShipmentStatusAction } from "@/actions/admin/orders";
import { shipmentStatusLabel, orderStatusLabel } from "@/lib/order-status";
import { formatARS, formatAdminDate } from "@/lib/admin/format";
import type { AdminActionResult, AdminShipmentRow } from "@/types/admin";

const LOGISTIC_LABELS: Record<string, string> = {
  carrier_dropoff: "A sucursal",
  xd_dropoff: "A sucursal",
  xdl: "A domicilio",
  carrier: "A domicilio",
};

export default function ShipmentsAdmin({ rows }: { rows: AdminShipmentRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<AdminActionResult | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="admin-empty">
        No hay envíos todavía. Se crean desde Pedidos con «Pasar a envío».
      </p>
    );
  }

  const refresh = async (orderId: string) => {
    setError(null);
    setRefreshing(orderId);
    try {
      const result = await refreshShipmentStatusAction(orderId);
      if (!result.ok) setError(result);
      else router.refresh();
    } catch {
      setError({ ok: false, error: "Error de conexión" });
    } finally {
      setRefreshing(null);
    }
  };

  const statusBadgeClass = (status: string | null) => {
    if (status === "delivered") return "available";
    if (status === "not_delivered" || status === "cancelled") return "status-rejected";
    return "status-approved";
  };

  return (
    <div className="admin-shipments">
      {error && (
        <div className="admin-banner error">
          <span>{error.error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar">
            ×
          </button>
        </div>
      )}

      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Estado pedido</th>
              <th>Envío</th>
              <th>Opción</th>
              <th>Destino</th>
              <th>Cliente</th>
              <th className="admin-col-number">Costo</th>
              <th>Tracking</th>
              <th className="admin-col-actions" aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.orderId}>
                <td>
                  <div className="admin-cell-name">
                    <span className="admin-cell-title">
                      #{row.orderId.slice(0, 8)}
                    </span>
                    <span className="admin-cell-sub">
                      {formatAdminDate(row.createdAt)} · {formatARS(row.total)}
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`admin-status-badge status-${row.orderStatus}`}>
                    {orderStatusLabel({
                      status: row.orderStatus,
                      shipmentId: row.shipmentId,
                    })}
                  </span>
                </td>
                <td className="admin-col-center">
                  <span
                    className={`admin-status-badge ${statusBadgeClass(
                      row.liveStatus ?? row.shipmentStatus
                    )}`}
                  >
                    {shipmentStatusLabel(row.liveStatus ?? row.shipmentStatus) ?? "—"}
                  </span>
                </td>
                <td>
                  {row.shippingService
                    ? [
                        row.shippingService,
                        LOGISTIC_LABELS[row.shippingLogistic ?? ""] ??
                          row.shippingLogistic,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "—"}
                </td>
                <td className="admin-cell-sub">{row.destination ?? "—"}</td>
                <td>
                  <div className="admin-cell-name">
                    <span className="admin-cell-title">{row.userName}</span>
                    <span className="admin-cell-sub">{row.userEmail}</span>
                  </div>
                </td>
                <td className="admin-cell-price">
                  {row.shippingCost != null ? formatARS(row.shippingCost) : "—"}
                </td>
                <td>
                  {row.trackingUrl ? (
                    <a
                      href={row.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-tracking-link"
                      title={row.trackingNumber ?? undefined}
                    >
                      Ver ↗
                    </a>
                  ) : (
                    (row.trackingNumber ?? "—")
                  )}
                </td>
                <td className="admin-col-actions">
                  <Link
                    href={`/admin/pedidos/${row.orderId}`}
                    className="admin-button small"
                  >
                    Abrir
                  </Link>
                  <button
                    type="button"
                    className="admin-button small"
                    disabled={refreshing === row.orderId}
                    onClick={() => refresh(row.orderId)}
                  >
                    {refreshing === row.orderId ? "..." : "Actualizar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
