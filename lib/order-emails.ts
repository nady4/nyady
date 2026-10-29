/**
 * Order email flows (confirmation, pending-payment instructions and status
 * changes) built on the shared shell (lib/emails/templates.ts).
 */
import prisma from "@/lib/prisma";
import { num } from "@/lib/money";
import {
  sendOrderConfirmationEmail,
  sendOrderPendingEmail,
  sendOrderStatusEmail
} from "@/lib/email";
import { orderStatusLabel, shipmentStatusLabel } from "@/lib/order-status";

export interface EmailOrderItem {
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
}

const ELABORATION_NOTE =
  "Cada producto se elabora a mano en 3 a 7 días hábiles desde la confirmación del pago. El envío demora 3 a 7 días hábiles más desde que sale de nuestro taller.";

export function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString("es-AR")}`;
}

/**
 * "Pedido confirmado" email. Called when an order becomes approved
 * (Merardo Pago webhook transition or an admin-created approved order).
 * Failures are swallowed: email is best-effort, payment flows can't break.
 */
export async function notifyOrderConfirmed(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { username: true, email: true } },
        orderItems: {
          select: {
            productName: true,
            productPhoto: true,
            selectedColor: true,
            selectedSize: true,
            selectedTacoOption: true,
            quantity: true,
            unitPrice: true,
            product: { select: { name: true, price: true, photo: true } },
          },
        },
      },
    });
    if (!order) return;

    const selection = order.shippingSelection as
      | { shippingCost?: number; serviceType?: string }
      | null;

    const items: EmailOrderItem[] = order.orderItems.map((item) => {
      const variant = [
        item.selectedColor,
        item.selectedSize,
        item.selectedTacoOption && `taco ${item.selectedTacoOption}`
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        name: item.productName || item.product?.name || "Producto",
        variant,
        quantity: item.quantity,
        unitPrice: num(item.unitPrice ?? item.product?.price ?? 0),
      };
    });

    const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
    const shippingCost = Math.max(0, Number(selection?.shippingCost ?? 0));
    const discount = num(order.discountAmount) > 0
      ? Math.max(0, subtotal + shippingCost - num(order.total))
      : 0;

    const paymentLabel =
      order.source === "manual"
        ? "Acordado con el vendedor (pedido manual)"
        : "Mercado Pago (tarjeta, transferencia o efectivo)";

    await sendOrderConfirmationEmail({
      to: order.user.email,
      username: order.user.username,
      orderId: order.id,
      items,
      subtotal,
      discountLabel: order.couponCode ? order.couponCode : null,
      discountAmount: discount,
      shippingCost: shippingCost > 0 ? shippingCost : null,
      total: num(order.total),
      paymentLabel,
      address: await readAddress(order.userId),
      recipientName: order.recipientName,
      elaborationNote: ELABORATION_NOTE,
    });
  } catch (error) {
    console.error("[order-emails] confirmation failed:", error);
  }
}

async function readAddress(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { address: true },
  });
  const address = user?.address;
  if (!address) return null;
  return [
    address.street,
    address.city,
    address.state,
    address.postalCode
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Status-change email (shipping or order status transitions triggered by the
 * admin dashboard or by a Zipnova refresh).
 */
export async function notifyOrderStatusChanged(
  orderId: string,
  trackingUrl?: string | null
): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { username: true, email: true } } },
    });
    if (!order) return;

    await sendOrderStatusEmail({
      to: order.user.email,
      username: order.user.username,
      orderId: order.id,
      statusLabel: orderStatusLabel(order),
      shipmentStatusLabel:
        order.shipmentId && order.shipmentStatus
          ? shipmentStatusLabel(order.shipmentStatus)
          : null,
      trackingUrl: order.trackingUrl ?? trackingUrl ?? null,
    });
  } catch (error) {
    console.error("[order-emails] status notification failed:", error);
  }
}
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  rapipago: "Rapipago",
  pagofacil: "Pago Fácil",
  pcb: "Transferencia bancaria",
  atm: "Red de cajeros",
  debito_avisos: "Débito",
  efectivo_atm: "Efectivo en cajeros"
};

function paymentMethodLabel(methodId: string): string {
  const key = methodId.toLowerCase();
  if (PAYMENT_METHOD_LABELS[key]) return PAYMENT_METHOD_LABELS[key];
  if (methodId.startsWith("master") || methodId.startsWith("credit_card"))
    return "Tarjeta de crédito";
  if (methodId.startsWith("deb"))
    return "Tarjeta de débito";
  return methodId;
}

/**
 * "Pago pendiente" email: fired when a payment lands on pending (offline
 * methods like Rapipago/Pago Fácil or card contingencias) iterando el cupón
 * de pago cuando Mercado Pago lo aporta.
 */
export async function notifyOrderPendingInstructions(
  orderId: string,
  paymentMethodId: string,
  paymentUrl: string | null,
  amount: number
): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { username: true, email: true } } },
    });
    if (!order) return;

    await sendOrderPendingEmail({
      to: order.user.email,
      username: order.user.username,
      orderId: order.id,
      paymentMethodLabel: paymentMethodLabel(paymentMethodId),
      paymentUrl,
      amount,
    });
  } catch (error) {
    console.error("[order-emails] pending instructions failed:", error);
  }
}
