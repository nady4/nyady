import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  notifyOrderConfirmed,
  notifyOrderPendingInstructions,
  notifyOrderStatusChanged
} from "@/lib/order-emails";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

/**
 * Map MP payment statuses onto the store's order vocabulary. Unknown statuses
 * are ignored (order stays untouched) so a new MP state can't inject garbage
 * into the dashboard; refund/chargeback flows land on `cancelled` with an
 * admin note hint, which the seller can review from the panel.
 */
function mapMpStatus(mpStatus: string): "approved" | "pending" | "rejected" | "cancelled" | null {
  switch (mpStatus) {
    case "approved":
      return "approved";
    case "pending":
    case "in_process": // card contingencias: pendiente hasta autorizar
      return "pending";
    case "rejected":
      return "rejected";
    case "cancelled":
    case "refunded": // reimbursed payment — order can't ship
    case "charged_back":
      return "cancelled";
    default:
      return null; // authorized, etc. — nothing to commit yet
  }
}

export async function POST(req: Request) {
  // Generous (MP retries in bursts), but still guards floods from anyone
  const rl = rateLimit({
    name: "mp-webhook",
    identity: clientIp(req),
    limit: 300,
    windowMs: 60_000
  });
  if (!rl.ok) return tooManyRequests(rl);

  try {
    const body = await req.json();

    const type = body.type;
    const data = body.data;

    if (type === "merchant_order") {
      // Merchant-order topics don't drive the order lifecycle (payment does);
      // respond 200 so MP stops retrying without doing work.
      return NextResponse.json({ received: true }, { status: 200 });
    }

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

        const externalReference = payment.external_reference as string | null;
        const mapped = mapMpStatus(String(payment.status ?? ""));

        if (externalReference && mapped) {
          // Look up the order first — a stale or forged notification may
          // reference an order that doesn't exist. Using update() directly
          // would throw RecordNotFound; findUnique + updateMany is safe.
          const existing = await prisma.order.findUnique({
            where: { id: externalReference },
            select: { userId: true, status: true, source: true },
          });

          if (!existing) {
            console.warn(
              "[mp-webhook] No order for external_reference",
              externalReference
            );
          } else if (existing.status !== mapped || mapped === "approved") {
            await prisma.order.updateMany({
              where: { id: externalReference },
              data: {
                status: mapped,
                // Keep a breadcrumb for refunded/charged_back payments so the
                // seller understands the manual intervention context.
                ...(mapped === "cancelled" &&
                ["refunded", "charged_back"].includes(
                  String(payment.status ?? "")
                )
                  ? {
                      notes:
                        ((
                          await prisma.order.findUnique({
                            where: { id: externalReference },
                            select: { notes: true }
                          })
                        )?.notes?.trim() ?? "") + ` [MP ${payment.status} ${payment.id}]`
                    }
                  : {}),
              },
            });

            // Email flows, each once per transition:
            // - pending (first time) → payment instructions with the MP coupon
            // - approved → confirmation
            // - rejected/cancelled → status notice
            if (
              mapped === "pending" &&
              existing.status !== "pending"
            ) {
              try {
                const method = String(payment.payment_method_id ?? "medio de pago");
                const url =
                  payment.transaction_details?.external_resource_url ?? null;
                await notifyOrderPendingInstructions(
                  externalReference,
                  method,
                  typeof url === "string" && url.startsWith("https") ? url : null,
                  Number(payment.transaction_amount ?? 0)
                );
              } catch (emailError) {
                console.error(
                  "[mp-webhook] pending instructions email failed:",
                  emailError
                );
              }
            }

            if (mapped === "approved" && existing.status !== "approved") {
              try {
                await notifyOrderConfirmed(externalReference);
              } catch (emailError) {
                console.error("[mp-webhook] confirmation email failed:", emailError);
              }
            }

            if (
              (mapped === "rejected" || mapped === "cancelled") &&
              existing.status !== mapped
            ) {
              try {
                await notifyOrderStatusChanged(externalReference);
              } catch (emailError) {
                console.error("[mp-webhook] status email failed:", emailError);
              }
            }

            // Clear only this buyer's cart, and only once the order is
            // committed. Clear on both "approved" (paid) and "pending"
            // (offline methods like RapiPago that settle later) so the cart
            // is emptied once the order is in flight, not only after it's
            // paid. Rejected payments keep the cart available for a retry.
            if (
              (mapped === "approved" || mapped === "pending") &&
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
