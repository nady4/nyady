import prisma from "@/lib/prisma";
import { getShipmentStatus } from "@/actions/shipping";
import { notifyOrderStatusChanged } from "@/lib/order-emails";

/**
 * Auto-refresh de estados de envío Zipnova.
 *
 * Pide el estado real del envío a Zipnova para las órdenes aprobadas con
 * shipment, actualiza `shipmentStatus` si cambió y avisa por email cuando
 * el paquete entrega (sin duplicar emails por envío).
 */

const FINAL_STATUSES = new Set(["delivered", "not_delivered", "cancelled"]);

export async function refreshShipmentStatuses(): Promise<{
  checked: number;
  updated: number;
  errors: number;
}> {
  const orders = await prisma.order.findMany({
    where: { status: "approved", shipmentId: { not: null } },
    select: {
      id: true,
      shipmentId: true,
      shipmentStatus: true,
      trackingUrl: true,
    },
    take: 200,
    orderBy: { updatedAt: "asc" },
  });

  let updated = 0;
  let errors = 0;

  for (const order of orders) {
    if (!order.shipmentId) continue;
    if (order.shipmentStatus && FINAL_STATUSES.has(order.shipmentStatus)) {
      continue; // estados finales no se re-consultan
    }

    try {
      const fresh = await getShipmentStatus(order.shipmentId);
      if (!fresh?.status || fresh.status === order.shipmentStatus) continue;

      // El shipment puede traer el tracking confirmado del carrier; lo
      // persistimos también si cambió. (El updateMany está bien porque la
      // orden del loop ya no cambia de dueño.)
      const current = await prisma.order.findUnique({
        where: { id: order.id },
        select: {
          trackingNumber: true,
          trackingUrl: true,
          userId: true,
          status: true,
          dispatchedAt: true,
        },
      });
      if (!current || current.status !== "approved") continue;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          shipmentStatus: fresh.status,
          trackingNumber:
            fresh.carrier_tracking_id ?? current.trackingNumber ?? undefined,
          trackingUrl:
            fresh.tracking_external ?? current.trackingUrl ?? undefined,
        },
      });
      updated += 1;

      // Email solo en cambios relevantes para el comprador (entrega o salida
      // del taller); el resigteenvenida del estado del envio (OTW) lo refresca
      // el dashboard al próximo acceso.
      if (fresh.status === "delivered" || fresh.status === "shipped") {
        await notifyOrderStatusChanged(
          order.id,
          fresh.tracking_external ?? undefined
        );
      }
    } catch (error) {
      errors += 1;
      console.error(
        `[zipnova-refresh] shipment ${order.shipmentId} failed:`,
        error
      );
    }
  }

  return { checked: orders.length, updated, errors };
}

interface AutoRefreshHandle {
  stop: () => void;
}

const active = { handle: null as AutoRefreshHandle | null };

/** Starts the background loop (idempotent). */
export function startShipmentAutoRefresh(): AutoRefreshHandle | null {
  if (active.handle) return active.handle;

  const intervalMs = Number(
    process.env.SHIPPING_REFRESH_INTERVAL_MS ?? 10 * 60_000
  );
  if (!Number.isFinite(intervalMs) || intervalMs < 60_000) return null;

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await refreshShipmentStatuses();
      if (result.updated || result.errors) {
        console.log(
          `[zipnova-refresh] checked=${result.checked} updated=${result.updated} errors=${result.errors}`
        );
      }
    } catch (error) {
      console.error("[zipnova-refresh] tick failed:", error);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void tick(), intervalMs);
  // No bloquear el cierre del proceso
  timer.unref?.();
  active.handle = {
    stop: () => {
      clearInterval(timer);
    },
  };
  console.log(`[zipnova-refresh] auto-refresh every ${Math.round(intervalMs / 1000)}s`);
  return active.handle;
}
