import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getShipmentStatus, getShipmentTracking } from "@/actions/shipping";

// GET /api/orders/[id]/tracking
// Auth-gated, ownership-scoped. Returns the Zipnova shipment status + history
// for an order. Lazily fetched by the /orders UI on demand (not at page load)
// to avoid hitting Zipnova's rate limits across many orders.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Ownership check — same findFirst-by-userId pattern used by the orders
  // page server actions. Returns 404 for both "not found" and "not yours" so
  // the existence of other users' orders isn't leaked.
  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id as string },
    select: {
      shipmentId: true,
      trackingNumber: true,
      trackingUrl: true
    }
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!order.shipmentId) {
    return NextResponse.json({ available: false });
  }

  const [status, history] = await Promise.all([
    getShipmentStatus(order.shipmentId),
    getShipmentTracking(order.shipmentId)
  ]);

  if (!status) {
    // Zipnova call failed — degrade gracefully. The UI still has the stored
    // tracking number/url from order creation, so mark available with an
    // error rather than 500.
    return NextResponse.json({
      available: true,
      error: "No se pudo obtener el estado del envío",
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      history: []
    });
  }

  return NextResponse.json({
    available: true,
    status: status.status,
    statusName: status.status_name,
    trackingNumber: status.carrier_tracking_id ?? order.trackingNumber,
    trackingUrl: status.tracking_external ?? order.trackingUrl,
    history: history?.data ?? []
  });
}
