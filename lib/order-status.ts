/**
 * Order + shipment status vocabulary shared by admin pages, buyer /orders and
 * shipping components. Pure module — safe on client and server.
 */

export interface OrderStatusLike {
  status: string;
  shipmentId?: string | null;
  /** Set when the admin dispatches without a Zipnova shipment yet. */
  dispatchedAt?: Date | string | null;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
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

/** "En Preparación" = approved but the Zipnova shipment doesn't exist yet. */
export function orderStatusLabel(order: OrderStatusLike): string {
  if (order.status === "approved") {
    // Dispatched (handed over) or with a Zipnova shipment → "En Envío".
    return order.shipmentId || order.dispatchedAt ? "En Envío" : "En Preparación";
  }
  return ORDER_STATUS_LABELS[order.status] || order.status;
}

export function shipmentStatusLabel(status: string | null | undefined): string | null {
  if (!status) return null;
  return SHIPMENT_STATUS_LABELS[status] || status;
}

/**
 * Allowed admin status transitions. Approved→cancelled requires explicit
 * confirmation in the UI (a real payment was taken); cancelled↔approved and
 * rejected→pending exist to fix mistakes.
 */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "rejected", "cancelled"],
  approved: ["cancelled"],
  rejected: ["pending"],
  cancelled: ["approved"],
};
