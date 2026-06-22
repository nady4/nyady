import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import OrderTracking from "@/components/OrderTracking";
import { getColorHex } from "@/lib/colors";
import "@/styles/Orders.scss";

export const metadata: Metadata = {
  title: "Mis pedidos - NYADY",
  description: "Ver el historial de tus pedidos de pantuflas y pantubotas artesanales.",
};

async function retryOrder(orderId: string) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const userId = session.user.id as string;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
      status: "pending"
    },
    include: {
      orderItems: true
    }
  });

  if (!order) {
    redirect("/orders");
  }

  await prisma.cart.deleteMany({
    where: { userId }
  });

  if (order.orderItems.length) {
    await prisma.cart.createMany({
      data: order.orderItems.map((item) => ({
        userId,
        productId: item.productId,
        quantity: item.quantity
      }))
    });
  }

  redirect("/cart");
}

async function cancelOrder(orderId: string) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const userId = session.user.id as string;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
      status: "pending"
    },
    select: {
      id: true,
      couponId: true
    }
  });

  if (!order) {
    redirect("/orders");
  }

  await prisma.orderItem.deleteMany({
    where: {
      orderId: order.id
    }
  });

  await prisma.order.delete({
    where: {
      id: order.id
    }
  });

  // Release the coupon: a cancelled order should not keep counting against
  // the coupon's usageLimit or the one-per-user check (which keys off past
  // orders with this couponId — now deleted). Best-effort.
  if (order.couponId) {
    try {
      await prisma.coupon.update({
        where: { id: order.couponId },
        data: { usedCount: { decrement: 1 } }
      });
    } catch (couponError) {
      console.error("[cancelOrder] Failed to decrement coupon:", couponError);
    }
  }

  redirect("/orders");
}

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const orders = await prisma.order.findMany({
    where: {
      userId: session.user.id as string,
      NOT: { status: "cancelled" }
    },
    orderBy: { createdAt: "desc" },
    include: {
      orderItems: {
        include: {
          product: true
        }
      }
    }
  });

  if (!orders.length) {
    return (
      <div className="orders-page">
        <h1>Mis pedidos</h1>
        <p>No hay ningún pedido</p>
        <Link href="/" className="back-button">
          Volver a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <h1>Mis pedidos</h1>
      <div className="orders-list">
        {orders.map((order) => (
          <div key={order.id} className="order-card">
            <div className="order-header">
              <span className="order-id">Pedido #{order.id.slice(0, 8)}</span>
              <span className={`order-status ${order.status}`}>
                Estado:{" "}
                <strong>
                  {order.status === "approved"
                    ? order.shipmentId
                      ? "En Envío"
                      : "En Preparación"
                    : order.status === "pending"
                      ? "Pendiente"
                      : order.status === "rejected"
                        ? "Rechazada"
                        : order.status}
                </strong>
              </span>
            </div>

            <div className="order-meta">
              <span>
                Fecha:{" "}
                {order.createdAt.toLocaleString("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
              <span className="order-total">
                Total: ${order.total.toLocaleString("es-AR")}
              </span>
            </div>

            {order.trackingNumber && (
              <div className="order-tracking-number">
                Seguimiento: {order.trackingNumber}
              </div>
            )}

            {order.couponCode && (
              <div className="order-coupon">
                Cupón: {order.couponCode} (−$
                {order.discountAmount.toLocaleString("es-AR")})
              </div>
            )}

            <div className="order-items">
              {order.orderItems.map((item) => (
                <div key={item.id} className="order-item">
                  <span className="order-item-name">
                    {item.product.name}
                    {item.selectedColor && (
                      <span
                        className="order-item-color"
                        style={{
                          backgroundColor: getColorHex(item.selectedColor),
                        }}
                        title={item.selectedColor}
                        aria-label={`Color ${item.selectedColor}`}
                      />
                    )}
                  </span>
                  <span className="order-item-qty">
                    Cantidad: {item.quantity}
                  </span>
                  <span className="order-item-subtotal">
                    Subtotal: $
                    {(item.product.price * item.quantity).toLocaleString(
                      "es-AR"
                    )}
                  </span>
                </div>
              ))}
            </div>

            {order.status === "pending" && (
              <div className="order-actions">
                <form action={retryOrder.bind(null, order.id)}>
                  <button type="submit" className="order-retry-button">
                    Reintentar pago
                  </button>
                </form>
                <form action={cancelOrder.bind(null, order.id)}>
                  <button type="submit" className="order-cancel-button">
                    Cancelar pedido
                  </button>
                </form>
              </div>
            )}

            {order.status === "approved" && order.shipmentId && (
              <OrderTracking
                orderId={order.id}
                trackingNumber={order.trackingNumber}
                trackingUrl={order.trackingUrl}
                shipmentStatus={order.shipmentStatus}
              />
            )}

            {order.status === "approved" && !order.shipmentId && (
              <div className="order-preparation">
                <p className="order-preparation-title">En Preparación</p>
                <p className="order-preparation-text">
                  Tu pedido está siendo elaborado a mano (3 a 7 días hábiles
                  desde la confirmación del pago). Cuando esté despachado vas a
                  poder seguir el envío acá.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="orders-actions">
        <Link href="/" className="button">
          Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
