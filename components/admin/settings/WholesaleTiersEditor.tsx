"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveWholesaleTiersAction } from "@/actions/admin/content";
import type { WholesaleTier } from "@/lib/discounts";
import { DEFAULT_WHOLESALE_TIERS } from "@/lib/discounts";

interface Row {
  units: string;
  label: string;
  percent: string;
}

function rowsFromTiers(value: WholesaleTier[] | null): Row[] {
  const tiers =
    value && value.length > 0 ? value : DEFAULT_WHOLESALE_TIERS;
  return tiers.map((tier) => ({
    units: String(tier.units),
    label: tier.label,
    percent: String(tier.percent),
  }));
}

/**
 * Editable volume-discount tiers (units, label, percent). Saved on the
 * StoreSettings singleton; the cart/cards/checkout read them live.
 */
export default function WholesaleTiersEditor({
  tiers,
}: {
  tiers: WholesaleTier[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(rowsFromTiers(tiers));
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  const updateRow = (index: number, changes: Partial<Row>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...changes } : row)));
  };

  const save = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const payload = rows.map((row) => ({
        units: Number(row.units) || 0,
        percent: Number(row.percent.replace(",", ".")) || 0,
        label: row.label.trim(),
      }));
      const result = await saveWholesaleTiersAction(payload);
      if (result.ok) {
        setMessage({ kind: "ok", text: "Tramos guardados" });
        router.refresh();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ kind: "error", text: result.error ?? "No se pudo guardar" });
      }
    } catch {
      setMessage({ kind: "error", text: "Error de conexión. Reintentá." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-tiers-editor">
      {rows.map((row, index) => (
        <div key={index} className="admin-tier-row">
          <label className="admin-tier-cell">
            <span>Unidades (desde)</span>
            <input
              type="number"
              min={2}
              max={1000}
              value={row.units}
              onChange={(e) => updateRow(index, { units: e.target.value })}
            />
          </label>
          <label className="admin-tier-cell admin-tier-cell-label">
            <span>Nombre</span>
            <input
              type="text"
              value={row.label}
              maxLength={24}
              onChange={(e) => updateRow(index, { label: e.target.value })}
              placeholder="MAYORISTA"
            />
          </label>
          <label className="admin-tier-cell">
            <span>Descuento (%)</span>
            <input
              type="number"
              min={1}
              max={90}
              step="1"
              value={row.percent}
              onChange={(e) => updateRow(index, { percent: e.target.value })}
            />
          </label>
          <button
            type="button"
            className="admin-button small danger"
            disabled={busy || rows.length <= 1}
            onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
            aria-label="Quitar tramo"
          >
            Quitar
          </button>
        </div>
      ))}

      <div className="admin-tier-actions">
        <button
          type="button"
          className="admin-button small"
          disabled={busy || rows.length >= 6}
          onClick={() =>
            setRows((prev) => [
              ...prev,
              { units: String((prev.at(-1)?.units ? Number(prev.at(-1)!.units) + 10 : 50)), label: "", percent: "" },
            ])
          }
        >
          + Agregar tramo
        </button>
        <button
          type="button"
          className="admin-button primary"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? "Guardando..." : "Guardar tramos"}
        </button>
        {message && (
          <span className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}>
            {message.text}
          </span>
        )}
      </div>

      <p className="admin-field-hint">
        Se aplican por cantidad de unidades del pedido, acumulando del tramo
        menor al mayor. Los tramos activos alimentan el carrito, las cards y
        el checkout en el momento.
      </p>
    </div>
  );
}
