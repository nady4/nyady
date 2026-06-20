import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCartProducts } from "@/actions/cart";
import prisma from "@/lib/prisma";

export async function POST() {
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

    const total = cartItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    const order = await prisma.order.create({
      data: {
        userId,
        status: "pending",
        total,
        orderItems: {
          create: cartItems.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        },
      },
    });

    const items = cartItems.map((item) => ({
      title: item.name,
      quantity: item.quantity,
      unit_price: item.price,
    }));

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
      return NextResponse.json(
        { error: "Error creating order" },
        { status: response.status }
      );
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