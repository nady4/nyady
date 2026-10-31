"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteReferralCodeAction,
  generateReferralCodesAction,
} from "@/actions/admin/marketing-planner";
import { formatARS } from "@/lib/money";
import type { ReferralCandidate, ReferralCodeRow } from "@/lib/marketing/referrals";

/**
 * Referral program (phase 5).
 *
 * The admin picks the discount, generates a code per top customer and shares
 * the link (the code travels in `ref`, the checkout applies it and the order
 * records it). Everything the referrer brings in shows up in the table.
 */
export default function ReferralCodesCard({
  codes,
  candidates,
}: {
  codes: ReferralCodeRow[];
  candidates: ReferralCandidate[];
}) {
  const router = useRouter();
  const [discount, setDiscount] = useState(10);
  const [count, setCount] = useState(10);
  const [campaign, setCampaign] = useState("referidos");
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );

  const generate = async () => {
    setMessage(null);
    setBusy("generate");
    try {
      const result = await generateReferralCodesAction({
        discountPercent: discount,
        count,
        campaign,
        expiresInDays: expiresInDays > 0 ? expiresInDays : null,
      });
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error ?? "No se pudieron generar" });
        return;
      }
      setMessage({
        kind: "ok",
        text: `${result.codes?.length ?? 0} código(s) generados. Compartí el link con cada clienta.`,
      });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Error de conexión. Reintentá." });
    } finally {
      setBusy(null);
    }
  };

  const disable = async (code: string) => {
    setMessage(null);
    setBusy(`del-${code}`);
    try {
      const result = await deleteReferralCodeAction(code);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error ?? "No se pudo desactivar" });
        return;
      }
      setMessage({ kind: "ok", text: `Código ${code} desactivado.` });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Error de conexión. Reintentá." });
    } finally {
      setBusy(null);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ kind: "ok", text: "Link copiado al portapapeles." });
    } catch {
      setMessage({ kind: "error", text: "No se pudo copiar: copialo a mano." });
    }
  };

  return (
    <div className="admin-mkt-referrals">
      {message && (
        <p
          className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}
          role="status"
        >
          {message.text}
        </p>
      )}

      <div className="admin-card">
        <h3 className="admin-card-title">Generar códigos de referido</h3>
        <p className="admin-field-hint">
          Cada código es un cupón con dueño: la clienta lo comparte, la buyer
          lo usa en el checkout y acá ves cuánto trajo cada una. Los códigos se
          generan para las clientas que más gastaron.
        </p>

        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Descuento para quien llega (%)</span>
            <input
              type="number"
              min={5}
              max={30}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            />
          </label>
          <label className="admin-field">
            <span>Cantidad de clientas</span>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
            />
          </label>
          <label className="admin-field">
            <span>Campaña (atribución)</span>
            <input
              type="text"
              maxLength={60}
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>Vencimiento (días)</span>
            <input
              type="number"
              min={0}
              max={365}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value) || 0)}
            />
          </label>
        </div>

        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-button primary"
            disabled={busy === "generate"}
            onClick={() => void generate()}
          >
            {busy === "generate" ? "Generando…" : "Generar códigos"}
          </button>
        </div>

        {candidates.length > 0 && (
          <p className="admin-field-hint">
            Se les generará un código a:{" "}
            {candidates
              .slice(0, count)
              .map((candidate) => candidate.username)
              .join(", ")}
          </p>
        )}
      </div>

      <div className="admin-card">
        <h3 className="admin-card-title">Códigos activos</h3>
        {codes.length === 0 ? (
          <p className="admin-empty">
            Todavía no hay códigos. Generá el primero para empezar la
            difusión.
          </p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Dueña</th>
                  <th>Desc.</th>
                  <th>Usos</th>
                  <th>Ventas</th>
                  <th>Facturado</th>
                  <th>Link</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {codes.map((row) => (
                  <tr key={row.code}>
                    <td>
                      <strong>{row.code}</strong>
                      {!row.active ? (
                        <span className="admin-cell-sub"> · inactivo</span>
                      ) : null}
                    </td>
                    <td>{row.ownerName ?? "—"}</td>
                    <td>{row.discountPercent ? `${row.discountPercent}%` : "—"}</td>
                    <td>{row.usedCount}</td>
                    <td>{row.orders}</td>
                    <td>{formatARS(row.revenue)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-button small"
                        onClick={() => void copy(row.link)}
                      >
                        Copiar link
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-button small danger"
                        disabled={busy === `del-${row.code}` || !row.active}
                        onClick={() => void disable(row.code)}
                      >
                        Desactivar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
