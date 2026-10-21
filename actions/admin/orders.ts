"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ensureAdmin } from "@/lib/admin";
import { markOrderReady } from "@/actions/orders";
import { validateCouponForUser } from "@/actions/coupons";
import { getShipmentStatus } from "@/actions/shipping";
import { getPhotoForColor } from "@/lib/colors";
import { computeDiscounts, roundCurrency } from "@/lib/discounts";
import { getStoreWholesaleTiers } from "@/lib/store-settings";
import { ORDER_STATUS_TRANSITIONS } from "@/lib/order-status";
import { notifyOrderConfirmed, notifyOrderStatusChanged } from "@/lib/order-emails";
import type { ProductType } from "@/types";
import type {
  AdminActionResult,
  ManualOrderInput,
  ManualOrderItemInput,
  OrderDetailsInput,
  OrderItemEditInput,
} from "@/types/admin";
import type { Prisma } from "@prisma/client";

interface ShippingSelectionLike {
  serviceType?: string;
  logisticType?: string;
  carrierId?: number;
  pickupPointId?: number | null;
  declaredValue?: number;
  shippingCost?: number;
}

function revalidateOrders(orderId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/envios");
  revalidatePath("/orders");
  if (orderId) revalidatePath(`/admin/pedidos/${orderId}`);
}

const MAX_ITEM_QTY = 100;
const MAX_ITEMS = 40;

function optionalTrim(value: string | null | undefined, max: number): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/**
 * Validate + snapshot item rows against the CURRENT product data (price,
 * name, variant photo via the same math the storefront uses). Throws with
 * known sentinel messages so actions can translate them to es-AR errors.
 */
async function buildOrderItemRows(
  items: ManualOrderItemInput[] | OrderItemEditInput[]
) {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, archivedAt: null },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const rows = items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) {
      throw new Error("PRODUCT_MISSING");
    }
    const quantity = Math.floor(Number(item.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_ITEM_QTY) {
      throw new Error("QTY_INVALID");
    }
    return {
      productId: product.id,
      quantity,
      selectedColor: optionalTrim(item.selectedColor ?? null, 40),
      selectedSize: optionalTrim(item.selectedSize ?? null, 40),
      selectedTacoOption: optionalTrim(item.selectedTacoOption ?? null, 40),
      unitPrice: roundCurrency(product.price),
      productName: product.name,
      productPhoto: getPhotoForColor(product as unknown as ProductType, item.selectedColor ?? null),
    };
  });

  if (rows.length === 0 || rows.length > MAX_ITEMS) {
    throw new Error("ITEMS_INVALID");
  }

  const productsTotal = rows.reduce((acc, row) => acc + row.unitPrice * row.quantity, 0);
  const totalQuantity = rows.reduce((acc, row) => acc + row.quantity, 0);

  return { rows, productsTotal, totalQuantity };
}

async function storedCouponForOrder(
  couponCode: string | null
): Promise<{ code: string; type: "PERCENT" | "FIXED"; value: number } | null> {
  const trimmed = (couponCode ?? "").trim();
  if (!trimmed) return null;

  const record = await prisma.coupon.findUnique({
    where: { code: trimmed },
    select: { code: true, type: true, value: true, active: true },
  });
  if (record && record.active) {
    return {
      code: record.code,
      type: record.type as "PERCENT" | "FIXED",
      value: record.value,
    };
  }
  return null;
}

/**
 * Admin-facing wrapper around markOrderReady: moves an approved order from
 * "En Preparación" to Zipnova by creating the shipment (POST /shipments).
 * The buyer-facing /orders page only reads tracking; shipment creation is
 * seller-only, gated here by the admin session cookie.
 */
export async function shipOrderAction(
  orderId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const result = await markOrderReady(orderId);

  if (result.ok) {
    await notifyOrderStatusChanged(orderId);
  }

  revalidateOrders(orderId);
  return result;
}

export async function updateOrderStatusAction(
  orderId: string,
  nextStatus: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado" };

  const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    return {
      ok: false,
      error: `No se puede pasar de "${order.status}" a "${nextStatus}"`,
    };
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });
  } catch (error) {
    console.error("[admin/orders] status update failed:", error);
    return { ok: false, error: "No se pudo actualizar el estado" };
  }

  // Emails as promised by the dashboard: payment confirmation on approve,
  // plain status notification otherwise. Best-effort.
  if (nextStatus === "approved" && order.status === "pending") {
    await notifyOrderConfirmed(orderId);
  } else {
    await notifyOrderStatusChanged(orderId);
  }

  revalidateOrders(orderId);
  return { ok: true };
}

export async function updateOrderDetailsAction(
  orderId: string,
  input: OrderDetailsInput
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        recipientName: optionalTrim(input.recipientName, 120),
        recipientDocument: optionalTrim(input.recipientDocument, 40),
        recipientPhone: optionalTrim(input.recipientPhone, 40),
        notes: optionalTrim(input.notes, 2000),
        trackingNumber: optionalTrim(input.trackingNumber, 100),
        trackingUrl: optionalTrim(input.trackingUrl, 500),
        shipmentStatus: optionalTrim(input.shipmentStatus, 60),
      },
    });
  } catch (error) {
    console.error("[admin/orders] details update failed:", error);
    return { ok: false, error: "No se pudo actualizar el pedido" };
  }

  revalidateOrders(orderId);
  return { ok: true };
}

/**
 * Rewrite the items of a pending order and recompute totals with the same
 * math the checkout uses (wholesale + stored coupon). Locked once approved,
 * so paid history can't be silently altered.
 */
export async function updateOrderItemsAction(
  orderId: string,
  items: OrderItemEditInput[]
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      couponCode: true,
      shippingSelection: true,
    },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado" };
  if (order.status !== "pending") {
    return {
      ok: false,
      error: "Solo los pedidos pendientes admiten cambios de items",
    };
  }

  try {
    const { rows, productsTotal, totalQuantity } = await buildOrderItemRows(items);

    const coupon = await storedCouponForOrder(order.couponCode);
    const selection = order.shippingSelection as ShippingSelectionLike | null;
    const shippingCost = Math.max(0, roundCurrency(Number(selection?.shippingCost ?? 0)) || 0);
    const wholesaleTiers = await getStoreWholesaleTiers();

    const discounts = computeDiscounts({ productsTotal, totalQuantity, coupon, tiers: wholesaleTiers });
    const total = roundCurrency(discounts.discountedSubtotal + shippingCost);

    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId } }),
      prisma.orderItem.createMany({
        data: rows.map((row) => ({
          orderId,
          productId: row.productId,
          quantity: row.quantity,
          selectedColor: row.selectedColor,
          selectedSize: row.selectedSize,
          selectedTacoOption: row.selectedTacoOption,
          unitPrice: row.unitPrice,
          productName: row.productName,
          productPhoto: row.productPhoto,
        })),
      }),
      prisma.order.update({
        where: { id: orderId },
        data: {
          total,
          discountAmount: roundCurrency(discounts.totalDiscount),
        },
      }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "PRODUCT_MISSING") {
      return { ok: false, error: "Hay un producto inválido o inactivo en la lista" };
    }
    if (message === "QTY_INVALID") {
      return { ok: false, error: "Las cantidades deben estar entre 1 y 100" };
    }
    if (message === "ITEMS_INVALID") {
      return { ok: false, error: `Agregá entre 1 y ${MAX_ITEMS} items` };
    }
    console.error("[admin/orders] items update failed:", error);
    return { ok: false, error: "No se pudo actualizar los items" };
  }

  revalidateOrders(orderId);
  return { ok: true };
}

export async function createManualOrderAction(
  input: ManualOrderInput
): Promise<AdminActionResult & { orderId?: string }> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  if (!input.userId) {
    return { ok: false, error: "Elegí el cliente del pedido" };
  }
  if (input.status !== "pending" && input.status !== "approved") {
    return { ok: false, error: "Estado inválido" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, archivedAt: true },
    });
    if (!user || user.archivedAt) {
      return { ok: false, error: "El cliente no existe o está archivado" };
    }

    const shippingCost = Math.max(
      0,
      roundCurrency(Number(input.shippingCost) || 0)
    );

    let coupon: {
      id: string;
      code: string;
      type: "PERCENT" | "FIXED";
      value: number;
    } | null = null;
    const couponCode = (input.couponCode ?? "").trim();
    if (couponCode) {
      const validation = await validateCouponForUser(couponCode, input.userId);
      if (!validation.ok || !validation.coupon) {
        return { ok: false, error: validation.error ?? "Cupón inválido" };
      }
      coupon = {
        id: validation.coupon.id,
        code: validation.coupon.code,
        type: validation.coupon.type,
        value: validation.coupon.value,
      };
    }

    const { rows, productsTotal, totalQuantity } =
      await buildOrderItemRows(input.items);

    const wholesaleTiers = await getStoreWholesaleTiers();
    const discounts = computeDiscounts({
      productsTotal,
      totalQuantity,
      coupon: coupon ? { code: coupon.code, type: coupon.type, value: coupon.value } : null,
      tiers: wholesaleTiers,
    });
    const total = roundCurrency(discounts.discountedSubtotal + shippingCost);

    const shippingSelection: Prisma.InputJsonValue | undefined =
      shippingCost > 0
        ? ({
            serviceType: "manual",
            logisticType: "manual",
            declaredValue: roundCurrency(productsTotal),
            shippingCost,
          } as Prisma.InputJsonValue)
        : undefined;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: input.userId,
          status: input.status,
          source: "manual",
          total,
          notes: optionalTrim(input.notes, 2000),
          recipientName: optionalTrim(input.recipientName, 120),
          recipientDocument: optionalTrim(input.recipientDocument, 40),
          recipientPhone: optionalTrim(input.recipientPhone, 40),
          shippingSelection,
          orderItems: {
            create: rows.map((row) => ({
              productId: row.productId,
              quantity: row.quantity,
              selectedColor: row.selectedColor,
              selectedSize: row.selectedSize,
              selectedTacoOption: row.selectedTacoOption,
              unitPrice: row.unitPrice,
              productName: row.productName,
              productPhoto: row.productPhoto,
            })),
          },
        },
        select: { id: true },
      });

      // Coupons are consumed at creation time in every flow (the web flow
      // consumes at preference creation), so the discount is always granted
      // together with the order it belongs to.
      if (coupon) {
        await tx.order.update({
          where: { id: created.id },
          data: {
            couponId: coupon.id,
            couponCode: coupon.code,
            discountAmount: roundCurrency(discounts.totalDiscount),
          },
        });
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return created;
    });

    if (input.status === "approved") {
      await notifyOrderConfirmed(order.id);
    }

    revalidateOrders(order.id);
    return { ok: true, orderId: order.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "PRODUCT_MISSING") {
      return { ok: false, error: "Hay un producto inválido o inactivo en la lista" };
    }
    if (message === "QTY_INVALID") {
      return { ok: false, error: "Las cantidades deben estar entre 1 y 100" };
    }
    if (message === "ITEMS_INVALID") {
      return { ok: false, error: `Agregá entre 1 y ${MAX_ITEMS} items` };
    }
    console.error("[admin/orders] manual create failed:", error);
    return { ok: false, error: "No se pudo crear el pedido" };
  }
}

/**
 * Marca la entrega real (handed over) BEFORE the Zipnova shipment exists:
 * "En Preparación" → "En Envío" sin esperar al correo/courier. El botón
 * "Pasar a envío (Zipnova)" sigue disponible para generar el envío real.
 */
export async function markOrderDispatchedAction(
  orderId: string,
  dispatched: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, shipmentId: true },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado" };
  if (order.shipmentId) {
    return { ok: false, error: "El pedido ya tiene un envío Zipnova" };
  }
  if (order.status !== "approved") {
    return { ok: false, error: "Solo los pedidos aprobados pueden pasar a envío" };
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { dispatchedAt: dispatched ? new Date() : null },
    });
  } catch (error) {
    console.error("[admin/orders] dispatch update failed:", error);
    return { ok: false, error: "No se pudo actualizar el estado" };
  }

  await notifyOrderStatusChanged(orderId);

  revalidateOrders(orderId);
  return { ok: true };
}

export async function archiveOrderAction(
  orderId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { archivedAt: new Date() },
    });
  } catch (error) {
    console.error("[admin/orders] archive failed:", error);
    return { ok: false, error: "No se pudo archivar el pedido" };
  }

  revalidateOrders(orderId);
  return { ok: true };
}

export async function restoreOrderAction(
  orderId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { archivedAt: null },
    });
  } catch (error) {
    console.error("[admin/orders] restore failed:", error);
    return { ok: false, error: "No se pudo restaurar el pedido" };
  }

  revalidateOrders(orderId);
  return { ok: true };
}

/**
 * Refresh the persisted Zipnova status (and tracking identifiers) of one
 * order. Best-effort: network failures surface a Spanish error and leave the
 * previously persisted data untouched.
 */
export async function refreshShipmentStatusAction(
  orderId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { shipmentId: true },
  });
  if (!order?.shipmentId) {
    return { ok: false, error: "El pedido no tiene envío creado" };
  }

  const fresh = await getShipmentStatus(order.shipmentId);
  if (!fresh) {
    return { ok: false, error: "Zipnova no respondió: probá de nuevo más tarde" };
  }

  const previousStatus = (
    await prisma.order.findUnique({
      where: { id: orderId },
      select: { shipmentStatus: true },
    })
  )?.shipmentStatus;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      shipmentStatus: fresh.status,
      ...(fresh.carrier_tracking_id ? { trackingNumber: fresh.carrier_tracking_id } : {}),
      ...(fresh.tracking_external ? { trackingUrl: fresh.tracking_external } : {}),
    },
  });

  if (fresh.status !== previousStatus) {
    await notifyOrderStatusChanged(orderId, fresh.tracking_external);
  }

  revalidateOrders(orderId);
  return { ok: true };
}
