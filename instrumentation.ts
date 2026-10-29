/**
 * Next.js instrumentation hook (runs once per server process).
 * Arranca el auto-refresh de estados de envío Zipnova en producción (y en
 * desarrollo, para QA manual). Se puede desactivar con
 * SHIPPING_REFRESH_INTERVAL_MS=0.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const mod = await import("@/lib/zipnova-refresh");
    mod.startShipmentAutoRefresh();
  } catch (error) {
    console.error("[instrumentation] shipment auto-refresh failed to start:", error);
  }
}
