import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCartProducts } from "@/actions/cart";
import { ShippingSelection } from "@/actions/shipping";
import { validateCouponForUser } from "@/actions/coupons";
import { computeDiscounts, roundCurrency } from "@/lib/discounts";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

interface CheckoutRequestBody {
  recipientName?: string;
  recipientDocument?: string;
  recipientPhone?: string;
  shippingSelection?: ShippingSelection;
  couponCode?: string;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const cartItems = await getCartProducts(userId);

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Checkout payload (recipient + chosen shipping option + optional coupon).
    // The body is optional only in the sense that older callers may omit it;
    // when a shippingSelection is present the recipient fields are required,
    // since they're needed to create the Zipnova shipment later.
    let body: CheckoutRequestBody = {};
    try {
      body = (await req.json()) as CheckoutRequestBody;
    } catch {
      body = {};
    }

    const {
      recipientName,
      recipientDocument,
      recipientPhone,
      shippingSelection,
      couponCode
    } = body;

    if (
      shippingSelection &&
      (!recipientName || !recipientDocument || !recipientPhone)
    ) {
      return NextResponse.json(
        { error: "Missing recipient data for shipping" },
        { status: 400 }
      );
    }

    // --- Discounts (server-side, so the charged total matches the cart) ---
    const productsTotal = cartItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    const totalQuantity = cartItems.reduce(
      (acc, item) => acc + item.quantity,
      0
    );

    // Validate the coupon BEFORE creating the order so a bad coupon returns
    // 400 without leaving an empty/pending order behind. Validation does not
    // consume the coupon (no usedCount increment) — that happens after the
    // order is committed.
    let validatedCouponId: string | null = null;
    let validatedCoupon: {
      id: string;
      code: string;
      type: "PERCENT" | "FIXED";
      value: number;
    } | null = null;
    if (couponCode && couponCode.trim() !== "") {
      const validation = await validateCouponForUser(couponCode, userId);
      if (!validation.ok || !validation.coupon) {
        return NextResponse.json(
          { error: validation.error ?? "Cupón inválido" },
          { status: 400 }
        );
      }
      validatedCoupon = validation.coupon;
      validatedCouponId = validation.coupon.id;
    }

    const discounts = computeDiscounts({
      productsTotal,
      totalQuantity,
      coupon: validatedCoupon
        ? {
            code: validatedCoupon.code,
            type: validatedCoupon.type,
            value: validatedCoupon.value
          }
        : null
    });

    const shippingCost = shippingSelection?.shippingCost ?? 0;
    const total = discounts.discountedSubtotal + shippingCost;

    // Create the order WITHOUT coupon fields first. The coupon is only
    // consumed (usedCount incremented + couponId recorded) once the MP
    // preference is successfully created — otherwise a failed preference
    // would burn a one-per-user coupon and leave an orphan pending order
    // that blocks the user from retrying with that coupon.
    const order = await prisma.order.create({
      data: {
        userId,
        status: "pending",
        total,
        recipientName: recipientName || null,
        recipientDocument: recipientDocument || null,
        recipientPhone: recipientPhone || null,
        shippingSelection: shippingSelection
          ? (shippingSelection as unknown as Prisma.InputJsonValue)
          : undefined,
        orderItems: {
          create: cartItems.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        },
      },
    });

    // MP rejects negative unit_price, so apply the discount by sending each
    // product at its proportionally-discounted unit price. The sum of
    // (discounted unit_price * quantity) across items equals the discounted
    // products total (within rounding). Shipping is a separate positive item.
    const items = cartItems.map((item) => ({
      title: item.name,
      quantity: item.quantity,
      unit_price: roundCurrency(
        item.price * (1 - discounts.effectiveDiscountRate)
      ),
    }));

    if (shippingCost > 0) {
      items.push({
        title: "Envío",
        quantity: 1,
        unit_price: shippingCost,
      });
    }

    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
          back_urls: {
            success: `${process.env.NEXTAUTH_URL}/success`,
            failure: `${process.env.NEXTAUTH_URL}/failure`,
            pending: `${process.env.NEXTAUTH_URL}/pending`,
          },
          // auto_return requires https back_urls. MP rejects http URLs (e.g. a
          // http://localhost dev NEXTAUTH_URL) with "auto_return invalid.
          // back_url.success must be defined", so only enable it for https.
          ...(process.env.NEXTAUTH_URL?.startsWith("https://")
            ? { auto_return: "approved" }
            : {}),
          notification_url: `${process.env.NEXTAUTH_URL}/api/mp-webhook`,
          external_reference: order.id,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Mercado Pago error:", error);
      // Roll back the orphan pending order so it doesn't block a coupon
      // retry or pollute the user's order history. OrderItems must be
      // removed first (no cascade on the relation).
      try {
        await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
        await prisma.order.delete({ where: { id: order.id } });
      } catch (rollbackError) {
        console.error("[orders] Orphan rollback failed:", rollbackError);
      }
      return NextResponse.json(
        { error: "Error creating order" },
        { status: response.status }
      );
    }

    // MP preference created — now consume the coupon: record it on the
    // order and increment usedCount. Best-effort; a failure here leaves the
    // order without a recorded coupon (still charged at the discounted
    // total) but must not fail the response.
    if (validatedCouponId) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            couponId: validatedCouponId,
            couponCode: validatedCoupon ? validatedCoupon.code : null,
            discountAmount: discounts.totalDiscount,
          },
        });
        await prisma.coupon.update({
          where: { id: validatedCouponId },
          data: { usedCount: { increment: 1 } },
        });
      } catch (couponError) {
        console.error(
          "[orders] Failed to record coupon on order:",
          couponError
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}