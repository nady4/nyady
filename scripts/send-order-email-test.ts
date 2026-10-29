/**
 * Sends the sample order-confirmation + status-change emails to
 * dev@nady4.com so the layout can be reviewed in a real inbox. Uses a real
 * product + the discount math so the copy mirrors production emails.
 * Run: bunx tsx scripts/send-order-email-test.ts
 */
import { num } from "@/lib/money";
import prisma from "@/lib/prisma";
import { notifyOrderConfirmed, notifyOrderStatusChanged } from "@/lib/order-emails";
import { computeDiscounts, roundCurrency } from "@/lib/discounts";
import type { Prisma } from "@prisma/client";

const TEST_TO = "dev@nady4.com";

async function main() {
  const products = await prisma.product.findMany({
    where: { available: true, archivedAt: null },
    take: 2,
  });
  if (products.length === 0) throw new Error("No products to build the sample order");

  const items = products.map((product, idx) => ({
    productId: product.id,
    quantity: idx === 0 ? 3 : 1,
    selectedColor: product.colors[0] ?? null,
    selectedSize: product.sizes[0] ?? null,
    selectedTacoOption: null,
    unitPrice: roundCurrency(num(product.price)),
    productName: product.name,
    productPhoto: product.photo,
  }));

  const productsTotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
  const discounts = computeDiscounts({ productsTotal, totalQuantity, coupon: null });
  const shippingCost = 5499;
  const total = roundCurrency(discounts.discountedSubtotal + shippingCost);

  const user = await prisma.user.findUnique({
    where: { email: TEST_TO },
    select: { id: true, username: true, email: true },
  });

  if (!user) {
    await prisma.user.create({
      data: {
        email: TEST_TO,
        username: "dev",
        password: "not-a-login",
        emailVerified: new Date(),
        address: {
          create: {
            street: "Av. Siemprevista 742",
            city: "Buenos Aires",
            state: "CABA",
            postalCode: "C1043",
            country: "AR",
          },
        },
      },
    });
  }

  const recipient = await prisma.user.findUnique({
    where: { email: TEST_TO },
    select: { id: true },
  });

  const order = await prisma.order.create({
    data: {
      userId: recipient!.id,
      status: "approved",
      source: "web",
      total,
      discountAmount: roundCurrency(discounts.totalDiscount),
      recipientName: "Dev Nady4",
      recipientDocument: "30123456",
      recipientPhone: "+5491100000000",
      shippingSelection: {
        serviceType: "carrier_dropoff",
        logisticType: "xd_dropoff",
        declaredValue: productsTotal,
        shippingCost,
      } as unknown as Prisma.InputJsonValue,
      orderItems: { create: items },
    },
    select: { id: true },
  });

  console.log("[test-email] pedido de muestra:", order.id, "total:", total);

  await notifyOrderConfirmed(order.id);
  console.log(`[test-email] confirmación enviada a ${TEST_TO}`);

  await notifyOrderStatusChanged(order.id);
  console.log(`[test-email] email de estado (En Preparación) enviado a ${TEST_TO}`);

  // Cleanup the sample order so it doesn't pollute the admin.
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
  console.log("[test-email] pedido de muestra eliminado");

  await prisma.$disconnect();
}

main();
