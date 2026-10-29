/**
 * Formatting helpers shared by admin pages and components. Pure functions —
 * safe to import from both server and client components.
 */

/** Current timestamp in ms. Wrapping Date.now() keeps server-component
 * render code honest with react-hooks purity linting (the value is computed
 * per request on a dynamic page). */
export function nowMs(): number {
  return Date.now();
}

/** `$1.234.567` (es-AR, no decimals — prices are whole ARS in practice). */
export function formatARS(value: number | { toNumber(): number }): string {
  const n = typeof value === "number" ? value : value.toNumber();
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

/** `dd/mm/yyyy` */
export function formatAdminDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** `dd/mm/yyyy HH:mm` */
export function formatAdminDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return String(date);
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
