import prisma from "@/lib/prisma";
import { num } from "@/lib/money";
import { isAdmin } from "@/lib/admin";
import { orderStatusLabel } from "@/lib/order-status";

export const runtime = "nodejs";

interface ShippingSelectionLike {
  shippingCost?: number;
  serviceType?: string;
}

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",;\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

// GET /api/admin/export/orders
// CSV download of orders with the same server-side filters as the admin list
// (?q, ?status, ?archive). Cookie-guarded — the proxy matcher doesn't cover
// /api/admin/*.
export async function GET(request: Request): Promise<Response> {
  if (!(await isAdmin())) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const status = url.searchParams.get("status") ?? "";
  const archived = url.searchParams.get("archived") === "1";
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");

  const createdAt: Record<string, Date> = {};
  if (fromRaw) {
    const from = new Date(`${fromRaw}T00:00:00`);
    if (!Number.isNaN(from.getTime())) createdAt.gte = from;
  }
  if (toRaw) {
    const to = new Date(`${toRaw}T00:00:00`);
    if (!Number.isNaN(to.getTime())) {
      createdAt.lte = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1);
    }
  }

  const where = {
    archivedAt: archived ? { not: null } : null,
    ...(status ? { status } : {}),
    ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: "insensitive" as const } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
            { user: { username: { contains: q, mode: "insensitive" as const } } },
            { recipientName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        include: { address: true },
      },
      orderItems: true,
    },
  });

  const header = [
    "Pedido",
    "Fecha",
    "Estado",
    "Origen",
    "Cliente",
    "Email",
    "Items",
    "Subtotal",
    "Descuento",
    "Envio",
    "Total",
    "Cupon",
    "Destinatario",
    "Telefono",
    "Direccion",
    "Tracking",
    "Estado envio",
    "Notas",
  ];

  const lines = [header.join(",")];
  for (const order of orders) {
    const subtotal = order.orderItems.reduce(
      (acc, item) => acc + num(item.unitPrice ?? 0) * item.quantity,
      0
    );
    const selection = order.shippingSelection as ShippingSelectionLike | null;
    const shipping = Number(selection?.shippingCost ?? 0);
    const items = order.orderItems
      .map((item) => {
        const name = item.productName ?? "";
        const variant = [item.selectedColor, item.selectedSize, item.selectedTacoOption]
          .filter(Boolean)
          .join("/");
        return `${item.quantity}× ${name}${variant ? ` (${variant})` : ""}`;
      })
      .join("; ");

    const address = order.user.address
      ? `${order.user.address.street}, ${order.user.address.city}, ${order.user.address.state}, ${order.user.address.postalCode}`
      : "";

    lines.push(
      [
        order.id,
        order.createdAt.toISOString(),
        orderStatusLabel(order),
        order.source,
        order.user.username,
        order.user.email,
        items,
        subtotal.toFixed(2),
        (order.discountAmount ?? 0).toFixed(2),
        shipping.toFixed(2),
        order.total.toFixed(2),
        order.couponCode ?? "",
        order.recipientName ?? "",
        order.recipientPhone ?? "",
        address,
        order.trackingNumber ?? "",
        order.shipmentStatus ?? "",
        order.notes ?? "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const body = `\uFEFF${lines.join("\r\n")}`; // BOM so Excel opens UTF-8 fine

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-${stamp}.csv"`,
    },
  });
}
