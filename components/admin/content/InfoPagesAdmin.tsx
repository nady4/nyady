"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteInfoPageAction,
  saveInfoPageAction,
} from "@/actions/admin/content";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { AdminActionResult } from "@/types/admin";

export interface AdminInfoPageRow {
  slug: string;
  title: string;
  edited: boolean;
  updatedAt: Date | null;
  dbContent: string | null;
  dbDescription: string | null;
  fallbackTitle: string;
  fallbackContent: string;
  fallbackDescription: string;
}

function LabelFor(slug: string): string {
  const label = SLUG_LABELS[slug];
  return label || slug;
}

const SLUG_LABELS: Record<string, string> = {
  elaboracion: "Tiempos de Elaboración",
  envios: "Envíos",
  "medios-de-pago": "Medios de Pago",
  promociones: "Promociones y Descuentos",
  "preguntas-frecuentes": "Preguntas Frecuentes",
  reembolsos: "Reembolsos",
  contacto: "Contacto",
};

export default function InfoPagesAdmin({ pages }: { pages: AdminInfoPageRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<{
    slug: string;
    title: string;
    description: string;
    content: string;
  } | null>(null);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="admin-info-pages">
      {message && (
        <p className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}>
          {message.text}
        </p>
      )}

      {draft ? (
        <div className="admin-card admin-info-form">
          <h2 className="admin-card-title">{LabelFor(draft.slug)}</h2>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>Título (ventana y H1)</span>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                maxLength={80}
              />
            </label>
            <label className="admin-field">
              <span>Descripción corta (SEO)</span>
              <input
                type="text"
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                maxLength={160}
              />
            </label>
            <label className="admin-field admin-field-wide">
              <span>Contenido (formato simple, se publica con los estilos del sitio)</span>
              <textarea
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                rows={16}
                placeholder={"## Título de sección\nTexto con **negritas**, _cursivas_ y [links](/info/envios).\n- Lista\n> Resaltado destacado"}
              />
            </label>
          </div>
          <p className="admin-field-hint">
            Formato: `## Título`, `### Subtítulo`, texto con **negrita** y
            _cursiva_, listas con `- `, pasos con `1. `, y líneas con `&gt;`
            para el bloque resaltado.
          </p>

          <div className="admin-form-actions">
            <button
              type="button"
              className="admin-button primary"
              disabled={busy}
              onClick={() => {
                const input = { ...draft };
                void run(() => saveInfoPageAction(input), () => setDraft(null));
              }}
            >
              {busy ? "Publicando..." : "Publicar"}
            </button>
            <button
              type="button"
              className="admin-button"
              onClick={() => setDraft(null)}
              disabled={busy}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Página</th>
                <th>URL</th>
                <th className="admin-col-center">Estado</th>
                <th className="admin-col-actions" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.slug} className={page.edited ? "" : "archived"}>
                  <td>
                    <div className="admin-cell-name">
                      <span className="admin-cell-title">{LabelFor(page.slug)}</span>
                      <span className="admin-cell-sub">
                        {page.edited
                          ? `Editada · ${page.updatedAt ? formatAdminDateTime(page.updatedAt) : ""}`
                          : "Contenido original"}
                      </span>
                    </div>
                  </td>
                  <td className="admin-cell-sub">
                    <Link href={`/info/${page.slug}`} target="_blank">
                      /info/{page.slug} ↗
                    </Link>
                  </td>
                  <td className="admin-col-center">
                    <span
                      className={`admin-status-badge ${
                        page.edited ? "available" : "unavailable"
                      }`}
                    >
                      {page.edited ? "Editada" : "Original"}
                    </span>
                  </td>
                  <td className="admin-col-actions">
                    <button
                      type="button"
                      className="admin-button small"
                      onClick={() =>
                        setDraft({
                          slug: page.slug,
                          title: page.edited
                            ? page.title
                            : page.fallbackTitle,
                          description: page.edited
                            ? page.dbDescription ?? page.fallbackDescription
                            : page.fallbackDescription,
                          content: page.edited
                            ? page.dbContent ?? page.fallbackContent
                            : page.fallbackContent,
                        })
                      }
                    >
                      Editar
                    </button>
                    {page.edited && (
                      <button
                        type="button"
                        className="admin-button small danger"
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Restaurar ${LabelFor(page.slug)} al contenido original?`
                            )
                          ) {
                            void run(() => deleteInfoPageAction(page.slug));
                          }
                        }}
                      >
                        Restaurar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="admin-field-hint">
        Las páginas legales (términos, privacidad, arrepentimiento, blog y
        nady4) siguen manejadas en código: su contenido es sensiblemente
        jurídico/estructural y no se edita desde acá.
      </p>
    </div>
  );
}
