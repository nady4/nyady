"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  mergeCategoryAction,
  renameCategoryAction,
} from "@/actions/admin/categories";
import type { AdminActionResult, AdminCategoryRow } from "@/types/admin";

interface Draft {
  mode: "rename" | "merge";
  category: string;
  target: string;
}

export default function CategoriesAdmin({
  rows,
}: {
  rows: AdminCategoryRow[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<AdminActionResult | null>(null);
  const [pending, setPending] = useState(false);

  if (rows.length === 0) {
    return (
      <p className="admin-empty">
        Todavía no hay categorías: se crean desde el formulario de productos.
      </p>
    );
  }

  const run = async (action: () => Promise<AdminActionResult>) => {
    setPending(true);
    try {
      const result = await action();
      setMessage(result.ok ? null : result);
      if (result.ok) {
        setDraft(null);
        router.refresh();
      }
    } catch {
      setMessage({ ok: false, error: "Error de conexión. Reintentá." });
    } finally {
      setPending(false);
    }
  };

  const submitDraft = () => {
    if (!draft) return;
    const target = draft.target.trim();
    if (draft.mode === "rename") {
      if (!target) {
        setMessage({ ok: false, error: "Ingresá el nombre nuevo" });
        return;
      }
      void run(() => renameCategoryAction(draft.category, target));
    } else {
      void run(() => mergeCategoryAction(draft.category, target));
    }
  };

  return (
    <div className="admin-categories">
      {message && (
        <div className="admin-banner error" role="alert">
          <span>{message.error}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Cerrar">
            ×
          </button>
        </div>
      )}

      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Categoría</th>
              <th scope="col" className="admin-col-number">Activos</th>
              <th scope="col" className="admin-col-number">Archivados</th>
              <th scope="col" className="admin-col-actions">
                  <span className="admin-sr-only">Acciones</span>
                </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isDraftTarget = draft?.category === row.category;

              if (isDraftTarget && draft) {
                return (
                  <tr key={row.category}>
                    <td>
                      <input
                        type="text"
                        autoFocus
                        className="admin-inline-input"
                        value={draft.target}
                        list="admin-category-targets"
                        aria-label={
                          draft.mode === "rename"
                            ? `Nombre nuevo para la categoría ${row.category}`
                            : `Fusión categorías: categoria destino para ${row.category}`
                        }
                        placeholder={
                          draft.mode === "rename"
                            ? "Nombre nuevo"
                            : "Fusionar en…"
                        }
                        onChange={(e) =>
                          setDraft({ ...draft, target: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            submitDraft();
                          }
                          if (e.key === "Escape") setDraft(null);
                        }}
                      />
                      <datalist id="admin-category-targets">
                        {rows
                          .filter((r) => r.category !== row.category)
                          .map((r) => (
                            <option key={r.category} value={r.category} />
                          ))}
                      </datalist>
                    </td>
                    <td colSpan={2} className="admin-cell-sub">
                      {draft.mode === "rename"
                        ? `${row.active} producto(s) pasan al nombre nuevo`
                        : `Se envían ${row.active} producto(s) a la categoría elegida`}
                    </td>
                    <td className="admin-col-actions">
                      <button
                        type="button"
                        className="admin-button small primary"
                        disabled={pending}
                        onClick={submitDraft}
                      >
                        {pending
                          ? "Guardando..."
                          : draft.mode === "rename"
                            ? "Renombrar"
                            : "Fusionar"}
                      </button>
                      <button
                        type="button"
                        className="admin-button small"
                        onClick={() => setDraft(null)}
                        disabled={pending}
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={row.category}>
                  <td className="admin-cell-title">{row.category}</td>
                  <td>{row.active}</td>
                  <td>
                    {row.archived > 0 ? row.archived : "—"}
                  </td>
                  <td className="admin-col-actions">
                    <button
                      type="button"
                      className="admin-button small"
                      onClick={() =>
                        setDraft({ mode: "rename", category: row.category, target: row.category })
                      }
                    >
                      Renombrar
                    </button>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        className="admin-button small"
                        onClick={() =>
                          setDraft({ mode: "merge", category: row.category, target: "" })
                        }
                      >
                        Fusionar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="admin-field-hint">
        Las categorías viven en los productos: una categoría sin productos
        desaparece sola. «Fusionar» mueve todos los productos a otra categoría.
      </p>
    </div>
  );
}
