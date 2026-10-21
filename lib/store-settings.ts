import prisma from "@/lib/prisma";
import {
  DEFAULT_WHOLESALE_TIERS,
  type WholesaleTier,
} from "@/lib/discounts";

/**
 * Validate + normalize a tiers edit from the admin dashboard. Returns the
 * canonical array sorted ascending by units, or an error string.
 */
export function parseWholesaleTiers(
  input: unknown
): { ok: boolean; error?: string; tiers?: WholesaleTier[] } {
  if (!Array.isArray(input)) {
    return { ok: false, error: "Los tramos no son una lista válida" };
  }
  if (input.length === 0 || input.length > 6) {
    return { ok: false, error: "Definí entre 1 y 6 tramos" };
  }

  const seenUnits = new Set<number>();
  const tiers: WholesaleTier[] = [];
  for (const raw of input) {
    const units = Math.floor(Number((raw as { units?: unknown }).units));
    const percent = Number((raw as { percent?: unknown }).percent);
    const label = String((raw as { label?: unknown }).label ?? "").trim();

    if (!Number.isFinite(units) || units < 2 || units > 1000) {
      return { ok: false, error: "Cada tramo necesita una cantidad entre 2 y 1000 unidades" };
    }
    if (seenUnits.has(units)) {
      return { ok: false, error: `La cantidad ${units} está repetida` };
    }
    if (!Number.isFinite(percent) || percent < 1 || percent > 90) {
      return { ok: false, error: "Cada tramo necesita un descuento entre 1% y 90%" };
    }
    if (!label || label.length > 24) {
      return { ok: false, error: "Cada tramo necesita un nombre de hasta 24 caracteres" };
    }
    seenUnits.add(units);
    tiers.push({ units, percent, label });
  }

  tiers.sort((a, b) => a.units - b.units);
  return { ok: true, tiers };
}

/**
 * Server-side read of the editable tiers (fallback to defaults on missing or
 * malformed data). No "use server": safe to import from server pages/actions;
 * client components get tiers via the getWholesaleTiers server action.
 */
export async function getStoreWholesaleTiers(): Promise<WholesaleTier[]> {
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { id: "default" },
      select: { wholesaleTiers: true },
    });
    const parsed = parseWholesaleTiers(settings?.wholesaleTiers);
    return parsed.ok && parsed.tiers ? parsed.tiers : DEFAULT_WHOLESALE_TIERS;
  } catch (error) {
    console.error("[store-settings] tiers read failed:", error);
    return DEFAULT_WHOLESALE_TIERS;
  }
}
