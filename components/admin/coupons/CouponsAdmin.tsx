"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCouponAction,
  deleteCouponAction,
  toggleCouponActiveAction,
  updateCouponAction,
} from "@/actions/admin/coupons";
import { formatAdminDate, formatARS } from "@/lib/admin/format";
import type {
  AdminActionResult,
  AdminCouponInput,
  AdminCouponRow,
} from "@/types/admin";

interface Draft {
  id: string | null;
  code: string;
  type: "PERCENT" | "FIXED";
  value: string;
  active: boolean;
  onePerUser: boolean;
  usageLimit: string;
  expiresAt: string;
}

const EMPTY_DRAFT: Draft = {
  id: null,
  code: "",
  type: "PERCENT",
  value: "",
  active: true,
  onePerUser: true,
  usageLimit: "",
  expiresAt: "",
};

function toDateInput(value: Date | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export type CouponState = "active" | "paused" | "expired" | "exhausted";

export function couponState(row: AdminCouponRow, now: number): CouponState {
  if (row.expiresAt && row.expiresAt.getTime() < now) return "expired";
  if (row.usageLimit !== null && row.usedCount >= row.usageLimit) {
    return "exhausted";
  }
  return row.active ? "active" : "paused";
}

const STATE_LABELS: Record<CouponState, string> = {
  active: "Activa",
  paused: "Pausada",
  expired: "Vencida",
  exhausted: "Agotada",
};

function buildInput(draft: Draft): AdminCouponInput {
  return {
    code: draft.code,
    type: draft.type,
    value: Number(draft.value.replace(",", ".")) || 0,
    active: draft.active,
    onePerUser: draft.onePerUser,
    usageLimit: draft.usageLimit.trim() === "" ? null : Number(draft.usageLimit),
    expiresAt: draft.expiresAt || null,
  };
}

export default function CouponsAdmin({
  coupons,
  now,
}: {
  coupons: AdminCouponRow[];
  now: number;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const closeDraft = () => setDraft(null);

  const run = async (
    action: () => Promise<AdminActionResult>,
    onDone?: () => void
  ) => {
    setMessage(null);
    setBusy(true);
    try {
      const result = await action();
      if (result.ok) {
        setMessage({ kind: "ok", text: "Listo" });
        onDone?.();
        router.refresh();
        setTimeout(() => setMessage(null), 2500);
      } else {
        setMessage({ kind: "error", text: result.error ?? "No se pudo completar" });
      }
    } catch {
      setMessage({ kind: "error", text: "Error de conexión. Reintentá." });
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = () => {
    if (!draft) return;
    if (draft.id) {
      void run(() => updateCouponAction(draft.id!, buildInput(draft)), closeDraft);
    } else {
      void run(() => createCouponAction(buildInput(draft)), closeDraft);
    }
  };

  return (
    <div className="admin-coupons">
      {message && (
        <p className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}>
          {message.text}
        </p>
      )}

      {draft ? (
        <div className="admin-card admin-coupon-form">
          <h2 className="admin-card-title">
            {draft.id ? `Editar cupón ${draft.code || ""}` : "Nuevo cupón"}
          </h2>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>Código (3-24, se normaliza a mayúsculas)</span>
              <input
                type="text"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder="BIENVENIDA10"
                maxLength={24}
                disabled={Boolean(draft.id)}
              />
            </label>

            <label className="admin-field">
              <span>Tipo</span>
              <select
                value={draft.type}
                onChange={(e) =>
                  setDraft({ ...draft, type: e.target.value as "PERCENT" | "FIXED" })
                }
              >
                <option value="PERCENT">Porcentaje (%)</option>
                <option value="FIXED">Monto fijo ($)</option>
              </select>
            </label>

            <label className="admin-field">
              <span>{draft.type === "PERCENT" ? "Porcentaje (1-100)" : "Monto ($)"}</span>
              <input
                type="number"
                min={draft.type === "PERCENT" ? 1 : 0.01}
                max={draft.type === "PERCENT" ? 100 : undefined}
                step={draft.type === "PERCENT" ? 1 : 0.01}
                value={draft.value}
                onChange={(e) => setDraft({ ...draft, value: e.target.value })}
              />
            </label>

            <label className="admin-field">
              <span>Límite de usos (vacío = sin límite)</span>
              <input
                type="number"
                min={1}
                value={draft.usageLimit}
                onChange={(e) => setDraft({ ...draft, usageLimit: e.target.value })}
              />
            </label>

            <label className="admin-field">
              <span>Vencimiento (opcional)</span>
              <input
                type="date"
                value={draft.expiresAt}
                onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })}
              />
            </label>

            <label className="admin-field admin-field-checkbox">
              <input
                type="checkbox"
                checked={draft.onePerUser}
                onChange={(e) => setDraft({ ...draft, onePerUser: e.target.checked })}
              />
              <span>Un uso por usuario</span>
            </label>

            <label className="admin-field admin-field-checkbox">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />
              <span>Activa</span>
            </label>
          </div>

          {draft.id && (
            <p className="admin-field-hint">
              El código no se puede cambiar en un cupón existente (los pedidos
              guardan el código usado). El límite no puede quedar por debajo de
              los usos actuales.
            </p>
          )}

          <div className="admin-form-actions">
            <button
              type="button"
              className="admin-button primary"
              disabled={busy}
              onClick={saveDraft}
            >
              {busy ? "Guardando..." : draft.id ? "Guardar cupón" : "Crear cupón"}
            </button>
            <button
              type="button"
              className="admin-button"
              onClick={closeDraft}
              disabled={busy}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="admin-button primary"
          onClick={() => setDraft({ ...EMPTY_DRAFT })}
        >
          + Nuevo cupón
        </button>
      )}

      {coupons.length === 0 ? (
        <p className="admin-empty">No hay cupones todavía</p>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cupón</th>
                <th>Descuento</th>
                <th className="admin-col-number">Usos</th>
                <th className="admin-col-center">Uno por usuario</th>
                <th>Vence</th>
                <th className="admin-col-center">Estado</th>
                <th className="admin-col-actions" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => {
                const state = couponState(coupon, now);
                const canDelete = coupon.usedCount === 0;
                return (
                  <tr key={coupon.id} className={state === "active" ? "" : "archived"}>
                    <td className="admin-cell-title">{coupon.code}</td>
                    <td>
                      {coupon.type === "PERCENT"
                        ? `−${coupon.value}%`
                        : `−${formatARS(coupon.value)}`}
                      {coupon.onePerUser ? " · 1×persona" : ""}
                    </td>
                    <td className="admin-col-number">
                      {coupon.usedCount}
                      {coupon.usageLimit === null ? " / ∞" : ` / ${coupon.usageLimit}`}
                    </td>
                    <td className="admin-col-center">
                      {coupon.onePerUser ? "Sí" : "No"}
                    </td>
                    <td className="admin-cell-date">
                      {coupon.expiresAt ? formatAdminDate(coupon.expiresAt) : "—"}
                    </td>
                    <td className="admin-col-center">
                      <span className={`admin-status-badge admin-coupon-${state}`}>
                        {STATE_LABELS[state]}
                      </span>
                    </td>
                    <td className="admin-col-actions">
                      <button
                        type="button"
                        className="admin-button small"
                        disabled={busy}
                        onClick={() => void run(() => toggleCouponActiveAction(coupon.id))}
                      >
                        {coupon.active ? "Pausar" : "Activar"}
                      </button>
                      <button
                        type="button"
                        className="admin-button small"
                        disabled={busy}
                        onClick={() =>
                          setDraft({
                            id: coupon.id,
                            code: coupon.code,
                            type: coupon.type,
                            value: String(coupon.value),
                            active: coupon.active,
                            onePerUser: coupon.onePerUser,
                            usageLimit:
                              coupon.usageLimit === null ? "" : String(coupon.usageLimit),
                            expiresAt: toDateInput(coupon.expiresAt),
                          })
                        }
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="admin-button small danger"
                        disabled={busy || !canDelete}
                        title={
                          canDelete
                            ? "Eliminar cupón"
                            : "Tiene usos: pausalo en vez de eliminarlo"
                        }
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Eliminar el cupón ${coupon.code}? Esta acción no se deshace.`
                            )
                          ) {
                            void run(() => deleteCouponAction(coupon.id));
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="admin-field-hint">
        Los cupones se aplican en el carrito con el descuento mayorista ya
        aplicado: porcentaje sobre el subtotal con mayorista, monto fijo topeado
        a ese subtotal.
      </p>
    </div>
  );
}
