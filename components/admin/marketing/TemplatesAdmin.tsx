"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TagInput from "@/components/admin/ui/TagInput";
import {
  createMarketingTemplateAction,
  deleteMarketingTemplateAction,
  updateMarketingTemplateAction,
} from "@/actions/admin/marketing";
import type { AdminActionResult, MarketingTemplateRow } from "@/types/admin";

const PLACEHOLDERS_HINT =
  "Usá {producto}, {precio}, {link} y {tallas} en el texto: el composer los reemplaza cuando aplicás la plantilla.";

interface DraftState {
  id: string | null;
  name: string;
  body: string;
  hashtags: string[];
}

const EMPTY_DRAFT: DraftState = { id: null, name: "", body: "", hashtags: [] };

function draftFromRow(row: MarketingTemplateRow): DraftState {
  return { id: row.id, name: row.name, body: row.body, hashtags: row.hashtags };
}

export default function TemplatesAdmin({
  templates,
}: {
  templates: MarketingTemplateRow[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<AdminActionResult>, onDone?: () => void) => {
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
    if (!draft.name.trim()) {
      setMessage({ kind: "error", text: "El nombre de la plantilla es obligatorio" });
      return;
    }
    if (!draft.body.trim()) {
      setMessage({ kind: "error", text: "Escribí el texto de la plantilla" });
      return;
    }
    if (draft.id) {
      void run(
        () =>
          updateMarketingTemplateAction(draft.id!, {
            name: draft.name,
            body: draft.body,
            hashtags: draft.hashtags,
          }),
        () => setDraft(null)
      );
    } else {
      void run(
        () =>
          createMarketingTemplateAction({
            name: draft.name,
            body: draft.body,
            hashtags: draft.hashtags,
          }),
        () => setDraft(null)
      );
    }
  };

  return (
    <div className="admin-mkt-templates">
      {message && (
        <p
          className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}
          role={message.kind === "ok" ? "status" : "alert"}
        >
          {message.text}
        </p>
      )}

      <p className="admin-field-hint">{PLACEHOLDERS_HINT}</p>

      {draft ? (
        <div className="admin-card admin-mkt-template-form">
          <h3 className="admin-card-title">
            {draft.id ? "Editar plantilla" : "Nueva plantilla"}
          </h3>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>Nombre (para vos)</span>
              <input
                type="text"
                value={draft.name}
                maxLength={80}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="¿Nuevo drop?"
                required
              />
            </label>
            <label className="admin-field admin-field-wide">
              <span>Texto del copy</span>
              <textarea
                rows={6}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                placeholder={"{producto} ya disponible 🙌\nTalles {tallas}\n{precio} · {link}"}
              />
            </label>
            <TagInput
              label="Hashtags fijos de la plantilla"
              values={draft.hashtags}
              onChange={(values) => setDraft({ ...draft, hashtags: values })}
              placeholder="sandalias y Enter"
            />
          </div>
          <div className="admin-form-actions">
            <button
              type="button"
              className="admin-button primary"
              disabled={busy}
              onClick={saveDraft}
            >
              {busy ? "Guardando..." : draft.id ? "Guardar" : "Crear plantilla"}
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
        <div className="admin-mkt-template-newrow">
          <button
            type="button"
            className="admin-button primary"
            onClick={() => setDraft({ ...EMPTY_DRAFT })}
          >
            + Nueva plantilla de copy
          </button>
        </div>
      )}

      {templates.length === 0 ? (
        <p className="admin-empty">
          Sin plantillas todavía. Sirven para reusar copys que ya te funcionaron.
        </p>
      ) : (
        <div className="admin-mkt-templates-list">
          {templates.map((template) => (
            <div key={template.id} className="admin-mkt-template-card">
              <div className="admin-mkt-template-main">
                <strong>{template.name}</strong>
                <p className="admin-cell-sub" title={template.body}>
                  {template.body.slice(0, 120)}
                  {template.body.length > 120 ? "…" : ""}
                </p>
                {template.hashtags.length > 0 && (
                  <div className="admin-mkt-tagsrow">
                    {template.hashtags.map((tag) => (
                      <span key={tag} className="admin-tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="admin-banner-actions">
                <button
                  type="button"
                  className="admin-button small"
                  disabled={busy}
                  onClick={() => setDraft(draftFromRow(template))}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="admin-button small danger"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`¿Eliminar la plantilla "${template.name}"?`)) {
                      void run(() => deleteMarketingTemplateAction(template.id));
                    }
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
