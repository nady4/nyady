import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const type = body.type;
    const data = body.data;

    if (type === "payment" && data?.id) {
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${data.id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          },
        }
      );

      if (paymentResponse.ok) {
        const payment = await paymentResponse.json();

        const status = payment.status as string;
        const externalReference = payment.external_reference as string | null;

        if (externalReference) {
          // Look up the order first — a stale or forged notification may
          // reference an order that doesn't exist. Using update() directly
          // would throw RecordNotFound; findUnique + updateMany is safe.
          const existing = await prisma.order.findUnique({
            where: { id: externalReference },
            select: { userId: true },
          });

          if (!existing) {
            console.warn(
              "[mp-webhook] No order for external_reference",
              externalReference
            );
          } else {
            await prisma.order.updateMany({
              where: { id: externalReference },
              data: { status },
            });

            // Clear only this buyer's cart, and only once the order is
            // committed. The previous version read userId from
            // payment.metadata (which the orders route never sends) —
            // undefined is ignored by Prisma's deleteMany, so it would have
            // wiped every user's cart on each webhook. Clear on both
            // "approved" (paid) and "pending" (offline methods like RapiPago
            // that settle later) so the cart is emptied once the order is in
            // flight, not only after it's paid.
            if (
              (status === "approved" || status === "pending") &&
              existing.userId
            ) {
              await prisma.cart.deleteMany({
                where: { userId: existing.userId },
              });
            }
          }

          // NOTE: the Zipnova shipment is NOT created here. After payment the
          // order enters "En Preparación" (artisanal crafting, 3-7 business
          // days per /info/elaboracion). The seller creates the shipment
          // manually once elaboración is done — see markOrderReady() in
          // actions/orders.ts. Until then shipmentId stays null and /orders
          // shows "En Preparación" with no tracking.
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook error", error);
    return NextResponse.json({ received: false }, { status: 200 });
  }
}