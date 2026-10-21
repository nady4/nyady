"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  archiveOrderAction,
  markOrderDispatchedAction,
  restoreOrderAction,
  shipOrderAction,
  updateOrderStatusAction,
} from "@/actions/admin/orders";
import {
  ORDER_STATUS_TRANSITIONS,
  orderStatusLabel,
} from "@/lib/order-status";
import type { AdminActionResult } from "@/types/admin";

export default function OrderStatusEditor({
  orderId,
  status,
  archivedAt,
  hasShipment,
  hasShippingData,
  dispatchedAt,
}: {
  orderId: string;
  status: string;
  archivedAt: Date | null;
  hasShipment: boolean;
  hasShippingData: boolean;
  dispatchedAt: Date | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const allowed = ORDER_STATUS_TRANSITIONS[status] ?? [];
  const canShip = status === "approved" && !hasShipment;
  const canDispatch = canShip && !dispatchedAt;
  const canShipHint =
    canShip && !hasShippingData
      ? "Faltan datos de destinatario/dirección para crear el envío Zipnova"
      : null;

  const run = async (action: () => Promise<AdminActionResult>) => {
    setError(null);
    setBusy(true);
    try {
      const result = await action();
      if (!result.ok) setError(result.error ?? "No se pudo completar");
      else router.refresh();
    } catch {
      setError("Error de conexión. Reintentá.");
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = (next: string) => {
    if (
      next === "cancelled" &&
      !window.confirm(
        "¿Marcar el pedido como Cancelada?\nEl cliente deja de ver el avance en Mis pedidos."
      )
    ) {
      return;
    }
    if (
      next === "rejected" &&
      !window.confirm("¿Marcar el pedido como Rechazada?")
    ) {
      return;
    }
    void run(() => updateOrderStatusAction(orderId, next));
  };

  if (archivedAt) {
    return (
      <div className="admin-order-status-editor">
        <span className="admin-status-badge status-cancelled">Archivado</span>
        <button
          type="button"
          className="admin-button small"
          disabled={busy}
          onClick={() => run(() => restoreOrderAction(orderId))}
        >
          {busy ? "Procesando..." : "Restaurar"}
        </button>
        {error && <p className="admin-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="admin-order-status-editor">
      <span className={`admin-status-badge status-${status}`}>
        {orderStatusLabel({
          status,
          shipmentId: hasShipment ? "x" : null,
          dispatchedAt: dispatchedAt ?? null,
        })}
      </span>

      {allowed.map((next) => (
        <button
          key={next}
          type="button"
          className={`admin-button small ${next === "cancelled" ? "danger" : ""}`}
          disabled={busy}
          onClick={() => changeStatus(next)}
        >
          {next === "approved"
            ? status === "cancelled"
              ? "Re-aprobar"
              : "Aprobar"
            : next === "rejected"
              ? "Rechazar"
              : next === "pending"
                ? "Volver a pendiente"
                : "Cancelar pedido"}
        </button>
      ))}

      <button
        type="button"
        className="admin-button small"
        disabled={busy}
        onClick={() => {
          if (
            window.confirm(
              "¿Archivar el pedido? Se oculta del listado y de los reportes \"activos\"; el cliente sigue viéndolo en Mis pedidos."
            )
          ) {
            void run(() => archiveOrderAction(orderId));
          }
        }}
      >
        Archivar
      </button>

      {canDispatch && (
        <>
          <button
            type="button"
            className="admin-button small primary"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "¿Marcar el pedido como En Envío? Se avisa al cliente y el pedido queda a cargo del envío acordado (sin seguimiento Zipnova)."
                )
              ) {
                void run(() => markOrderDispatchedAction(orderId, true));
              }
            }}
          >
            {busy ? "Procesando..." : "Marcar en envío"}
          </button>
          <button
            type="button"
            className="admin-button small primary"
            disabled={busy || Boolean(canShipHint)}
            title={canShipHint ?? undefined}
            onClick={() => void run(() => shipOrderAction(orderId))}
          >
            {busy ? "Procesando..." : "Pasar a envío (Zipnova)"}
          </button>
        </>
      )}

      {canShip && dispatchedAt && (
        <>
          <button
            type="button"
            className="admin-button small"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "¿Volver el pedido a En Preparación? Se avisa al cliente."
                )
              ) {
                void run(() => markOrderDispatchedAction(orderId, false));
              }
            }}
          >
            Volver a preparación
          </button>
          <button
            type="button"
            className="admin-button small primary"
            disabled={busy || Boolean(canShipHint)}
            title={canShipHint ?? undefined}
            onClick={() => void run(() => shipOrderAction(orderId))}
          >
            {busy ? "Procesando..." : "Pasar a envío (Zipnova)"}
          </button>
        </>
      )}

      {error && <p className="admin-error">{error}</p>}
    </div>
  );
}
