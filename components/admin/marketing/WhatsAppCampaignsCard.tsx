"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createWaCampaignAction,
  deleteWaCampaignAction,
  markWaSentAction,
  unmarkWaSentAction,
  updateWaCampaignAction,
} from "@/actions/admin/marketing";
import { formatAdminDate, formatARS } from "@/lib/admin/format";
import { waDeepLink, type WaRecipient } from "@/lib/marketing/wa-shared";
import type { AdminActionResult } from "@/types/admin";

export interface WaCampaignRow {
  id: string;
  name: string;
  bodyText: string;
  updatedAt: Date;
  sends: number;
}

export interface WaPostOption {
  id: string;
  title: string;
  body: string;
  hashtags: string[];
  productSlug: string | null;
}

interface WhatsAppCampaignsCardProps {
  campaigns: WaCampaignRow[];
  recipients: WaRecipient[];
  /** campaignId -> set of phones already marked as sent. */
  sentMap: Record<string, string[]>;
  posts: WaPostOption[];
  siteUrl: string;
}

interface DraftState {
  id: string | null;
  name: string;
  bodyText: string;
}

const EMPTY_DRAFT: DraftState = { id: null, name: "", bodyText: "" };

/** Digits → +54 9 xxx xxxx xxxx display form (wa.me ids carry the 9). */
function displayPhone(phone: string): string {
  const rest = phone.startsWith("549") ? phone.slice(3) : phone.slice(2);
  if (rest.length !== 10) return `+${phone}`;
  return `+54 9 ${rest.slice(0, 3)} ${rest.slice(3, 7)} ${rest.slice(7)}`;
}

export default function WhatsAppCampaignsCard({
  campaigns,
  recipients,
  sentMap,
  posts,
  siteUrl,
}: WhatsAppCampaignsCardProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    campaigns[0]?.id ?? null
  );
  const [onlyPending, setOnlyPending] = useState(true);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  const selected = campaigns.find((c) => c.id === selectedId) ?? null;
  const sentPhones = useMemo(
    () => new Set(selectedId ? (sentMap[selectedId] ?? []) : []),
    [selectedId, sentMap]
  );

  const visibleRecipients = useMemo(
    () =>
      onlyPending
        ? recipients.filter((r) => !sentPhones.has(r.phone))
        : recipients,
    [recipients, sentPhones, onlyPending]
  );

  const run = async (action: () => Promise<AdminActionResult>, okText = "Listo") => {
    setMessage(null);
    setBusy(true);
    try {
      const result = await action();
      if (result.ok) {
        setMessage({ kind: "ok", text: okText });
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
    if (!draft.name.trim()) {
      setMessage({ kind: "error", text: "El nombre es obligatorio" });
      return;
    }
    if (!draft.bodyText.trim()) {
      setMessage({ kind: "error", text: "Escribí el mensaje de la campaña" });
      return;
    }
    if (draft.id) {
      void run(
        () =>
          updateWaCampaignAction(draft.id!, {
            name: draft.name,
            bodyText: draft.bodyText,
          }),
        "Campaña guardada"
      ).then(() => {
        setSelectedId(draft.id);
        setDraft(null);
      });
    } else {
      void run(
        () =>
          createWaCampaignAction({ name: draft.name, bodyText: draft.bodyText }),
        "Campaña creada"
      ).then(() => setDraft(null));
    }
  };

  const importFromPost = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const parts = [post.body.trim()];
    if (post.hashtags.length > 0) {
      parts.push(post.hashtags.map((h) => `#${h}`).join(" "));
    }
    if (post.productSlug) {
      parts.push(`${siteUrl}/products/${post.productSlug}`);
    }
    setDraft({
      id: null,
      name: post.title.slice(0, 80),
      bodyText: parts.filter(Boolean).join("\n\n"),
    });
  };

  return (
    <div className="admin-mkt-wa">
      {message && (
        <p
          className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}
          role={message.kind === "ok" ? "status" : "alert"}
        >
          {message.text}
        </p>
      )}

      {draft ? (
        <div className="admin-card admin-mkt-wa-form">
          <h3 className="admin-card-title">
            {draft.id ? "Editar campaña de WhatsApp" : "Nueva campaña de WhatsApp"}
          </h3>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>Nombre (para vos)</span>
              <input
                type="text"
                value={draft.name}
                maxLength={80}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Reposición drop invierno"
              />
            </label>
            {posts.length > 0 && !draft.id && (
              <label className="admin-field">
                <span>Importar copy desde un post</span>
                <select value="" onChange={(e) => importFromPost(e.target.value)}>
                  <option value="">Elegir post…</option>
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="admin-field admin-field-wide">
              <span>Mensaje (máx. 2000)</span>
              <textarea
                rows={5}
                value={draft.bodyText}
                maxLength={2000}
                onChange={(e) => setDraft({ ...draft, bodyText: e.target.value })}
                placeholder="Hola! Nuevos colores del taco BLANCO ya disponibles en nyady.com"
              />
            </label>
          </div>
          <div className="admin-form-actions">
            <button
              type="button"
              className="admin-button primary"
              disabled={busy}
              onClick={saveDraft}
            >
              {busy ? "Guardando..." : draft.id ? "Guardar" : "Crear campaña"}
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={() => setDraft(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-mkt-wa-newrow">
          <button
            type="button"
            className="admin-button primary"
            onClick={() => setDraft({ ...EMPTY_DRAFT })}
          >
            + Nueva campaña de WhatsApp
          </button>
        </div>
      )}

      {campaigns.length === 0 ? (
        <p className="admin-empty">
          Sin campañas de WhatsApp. Creá una, escribí el mensaje y mandalo
          manualmente con wa.me a tus clientas con pedido registrado.
        </p>
      ) : (
        <div className="admin-mkt-wa-campaigns" role="tablist">
          {campaigns.map((campaign) => (
            <button
              key={campaign.id}
              type="button"
              role="tab"
              aria-selected={selectedId === campaign.id}
              className={`admin-mkt-wa-campaign ${
                selectedId === campaign.id ? "active" : ""
              }`}
              onClick={() => setSelectedId(campaign.id)}
            >
              <strong>{campaign.name}</strong>
              <span className="admin-cell-sub">
                {campaign.sends} enviados · {formatAdminDate(campaign.updatedAt)}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          <div className="admin-mkt-wa-preview">
            <div className="admin-mkt-wa-preview-head">
              <strong>Mensaje de “{selected.name}”</strong>
              <div className="admin-mkt-wa-preview-actions">
                <button
                  type="button"
                  className="admin-button small"
                  onClick={() =>
                    setDraft({
                      id: selected.id,
                      name: selected.name,
                      bodyText: selected.bodyText,
                    })
                  }
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="admin-button small danger"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`¿Eliminar la campaña "${selected.name}"?`)) {
                      void run(() => deleteWaCampaignAction(selected.id), "Campaña eliminada");
                    }
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
            <p className="admin-mkt-wa-text">{selected.bodyText}</p>
          </div>

          <div className="admin-mkt-wa-toolbar">
            <label className="admin-field admin-field-checkbox">
              <input
                type="checkbox"
                checked={onlyPending}
                onChange={(e) => setOnlyPending(e.target.checked)}
              />
              <span>Solo pendientes de enviar</span>
            </label>
            <span className="admin-cell-sub">
              {visibleRecipients.length} recipient(s) de {recipients.length} con pedidos
            </span>
          </div>

          <div className="admin-table-scroll">
            <table className="admin-table admin-mkt-wa-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Pedidos</th>
                  <th>Total</th>
                  <th>Últ. pedido</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecipients.slice(0, 120).map((recipient) => {
                  const sent = sentPhones.has(recipient.phone);
                  return (
                    <tr key={recipient.phone}>
                      <td title={recipient.name ?? ""}>{recipient.name ?? "—"}</td>
                      <td>{displayPhone(recipient.phone)}</td>
                      <td>{recipient.ordersCount}</td>
                      <td>{formatARS(recipient.totalSpent)}</td>
                      <td>{formatAdminDate(recipient.lastOrderAt)}</td>
                      <td>
                        <span
                          className={`admin-status-badge ${
                            sent ? "available" : "unavailable"
                          }`}
                        >
                          {sent ? "Enviado" : "Pendiente"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-mkt-wa-actions">
                          <a
                            className="admin-button small"
                            href={waDeepLink(recipient.phone, selected.bodyText)}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            Abrir chat
                          </a>
                          {sent ? (
                            <button
                              type="button"
                              className="admin-button small"
                              disabled={busy}
                              onClick={() =>
                                void run(
                                  () => unmarkWaSentAction(selected.id, recipient.phone),
                                  "Desmarcado"
                                )
                              }
                            >
                              Desmarcar
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="admin-button small primary"
                              disabled={busy}
                              onClick={() =>
                                void run(
                                  () =>
                                    markWaSentAction(
                                      selected.id,
                                      recipient.phone,
                                      recipient.name
                                    ),
                                  "Marcado como enviado"
                                )
                              }
                            >
                              Marcar enviado
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="admin-field-hint">
        Sin Cloud API: “Abrir chat” abre WhatsApp Web/app con el mensaje listo
        (wa.me). Marcá cada envío para no repetir destinatarias. Envío masivo
        automático = fase opcional con Cloud API (requiere verificación de
        negocio + plantillas aprobadas).
      </p>
    </div>
  );
}
