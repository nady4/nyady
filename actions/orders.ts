"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  createShipment,
  ShippingSelection,
  ShipmentRecipient,
  AddressType
} from "@/actions/shipping";

export interface MarkOrderReadyResult {
  ok: boolean;
  error?: string;
}

/**
 * Seller-facing action: mark an approved order as ready to ship after
 * elaboración (3-7 business days, per /info/elaboracion) is complete.
 *
 * This is the moment the Zipnova shipment is actually created — not at
 * payment time — so tracking only becomes available once the product is
 * crafted and handed to the carrier. Stores the shipment id, tracking
 * number/url and initial status on the order; /orders then shows the
 * tracking UI instead of "En Preparación".
 *
 * Idempotent: if the order already has a shipmentId it no-ops.
 */
export async function markOrderReady(
  orderId: string
): Promise<MarkOrderReadyResult> {
  if (!orderId) return { ok: false, error: "Missing order id" };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: { include: { address: true } } }
  });

  if (!order) return { ok: false, error: "Order not found" };

  // Only approved (paid) orders can move to shipping. Pending/rejected orders
  // have no elaboración to complete.
  if (order.status !== "approved") {
    return { ok: false, error: "Order is not approved" };
  }

  // Idempotency guard — a second click after the shipment exists is a no-op.
  if (order.shipmentId) {
    revalidatePath("/orders");
    return { ok: true };
  }

  if (
    !order.shippingSelection ||
    !order.recipientName ||
    !order.recipientDocument ||
    !order.recipientPhone ||
    !order.user?.address ||
    !order.user?.email
  ) {
    const missing: string[] = [];
    if (!order.shippingSelection) missing.push("selección de envío");
    if (!order.recipientName) missing.push("nombre del destinatario");
    if (!order.recipientDocument) missing.push("documento del destinatario");
    if (!order.recipientPhone) missing.push("teléfono del destinatario");
    if (!order.user?.address) missing.push("dirección del usuario");
    if (!order.user?.email) missing.push("email del usuario");
    return {
      ok: false,
      error: `Faltan datos del pedido: ${missing.join(", ")}`
    };
  }

  const recipient: ShipmentRecipient = {
    name: order.recipientName,
    document: order.recipientDocument,
    email: order.user.email,
    phone: order.recipientPhone
  };
  const address: AddressType = {
    id: order.user.address.id,
    street: order.user.address.street,
    city: order.user.address.city,
    state: order.user.address.state,
    postalCode: order.user.address.postalCode
  };
  const selection = order.shippingSelection as unknown as ShippingSelection;

  const created = await createShipment(order.id, recipient, address, selection);

  if (!created) {
    return {
      ok: false,
      error: "Zipnova rejected the shipment creation"
    };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      shipmentId: String(created.id),
      trackingNumber: created.carrier_tracking_id,
      trackingUrl: created.tracking_external,
      shipmentStatus: created.status
    }
  });

  revalidatePath("/orders");
  return { ok: true };
}
