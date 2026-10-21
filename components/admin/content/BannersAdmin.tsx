"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImagePicker from "@/components/admin/ui/ImagePicker";
import {
  createBannerAction,
  deleteBannerAction,
  moveBannerAction,
  toggleBannerActiveAction,
  updateBannerAction,
} from "@/actions/admin/content";
import type { AdminActionResult } from "@/types/admin";

export interface AdminBannerRow {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  href: string | null;
  placement: string;
  active: boolean;
  sortOrder: number;
  startsAt: Date | null;
  endsAt: Date | null;
}

interface DraftState {
  id: string | null;
  title: string;
  subtitle: string;
  imageUrl: string;
  href: string;
  placement: string;
  active: boolean;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
}

const EMPTY_DRAFT: DraftState = {
  id: null,
  title: "",
  subtitle: "",
  imageUrl: "",
  href: "/catalog",
  placement: "home_promo",
  active: true,
  sortOrder: "0",
  startsAt: "",
  endsAt: "",
};

function toDateInput(value: Date | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function draftFromRow(row: AdminBannerRow): DraftState {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    imageUrl: row.imageUrl,
    href: row.href ?? "",
    placement: row.placement,
    active: row.active,
    sortOrder: String(row.sortOrder),
    startsAt: toDateInput(row.startsAt),
    endsAt: toDateInput(row.endsAt),
  };
}

function buildInput(draft: DraftState) {
  return {
    title: draft.title,
    subtitle: draft.subtitle || null,
    imageUrl: draft.imageUrl,
    href: draft.href || null,
    placement: draft.placement,
    active: draft.active,
    sortOrder: Number(draft.sortOrder) || 0,
    startsAt: draft.startsAt ? new Date(`${draft.startsAt}T00:00:00`).toISOString() : null,
    endsAt: draft.endsAt
      ? new Date(`${draft.endsAt}T23:59:59`).toISOString()
      : null,
  };
}

export default function BannersAdmin({ banners }: { banners: AdminBannerRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
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
    if (!draft.imageUrl.trim()) {
      setMessage({ kind: "error", text: "Subí o pegá la imagen del banner" });
      return;
    }
    if (draft.id) {
      void run(() => updateBannerAction(draft.id!, buildInput(draft)), closeDraft);
    } else {
      void run(() => createBannerAction(buildInput(draft)), closeDraft);
    }
  };

  return (
    <div className="admin-banners">
      {message && (
        <p
          className={
            message.kind === "ok" ? "admin-saved-hint" : "admin-error"
          }
        >
          {message.text}
        </p>
      )}

      {draft ? (
        <div className="admin-card admin-banner-form">
          <h2 className="admin-card-title">
            {draft.id ? "Editar banner" : "Nuevo banner"}
          </h2>
          <div className="admin-form-grid">
            <label className="admin-field admin-field-wide">
              <span>Título</span>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                maxLength={80}
                required
              />
            </label>
            <label className="admin-field admin-field-wide">
              <span>Subtítulo (opcional)</span>
              <input
                type="text"
                value={draft.subtitle}
                onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                maxLength={160}
              />
            </label>

            <div className="admin-field admin-field-wide">
              <span>Imagen</span>
              <ImagePicker
                value={draft.imageUrl}
                onChange={(url) => setDraft({ ...draft, imageUrl: url })}
              />
            </div>

            <label className="admin-field">
              <span>Destino (ruta o URL)</span>
              <input
                type="text"
                value={draft.href}
                onChange={(e) => setDraft({ ...draft, href: e.target.value })}
                placeholder="/catalog"
              />
            </label>

            <label className="admin-field">
              <span>Orden (menor = primeros)</span>
              <input
                type="number"
                min={0}
                max={999}
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
              />
            </label>

            <label className="admin-field">
              <span>Vigente desde</span>
              <input
                type="date"
                value={draft.startsAt}
                onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
              />
            </label>

            <label className="admin-field">
              <span>Vigente hasta</span>
              <input
                type="date"
                value={draft.endsAt}
                onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })}
              />
            </label>

            <label className="admin-field admin-field-checkbox">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />
              <span>Activo</span>
            </label>
          </div>

          <div className="admin-form-actions">
            <button
              type="button"
              className="admin-button primary"
              disabled={busy}
              onClick={saveDraft}
            >
              {busy ? "Guardando..." : draft.id ? "Guardar banner" : "Crear banner"}
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
          + Nuevo banner
        </button>
      )}

      {banners.length === 0 ? (
        <p className="admin-empty">
          Sin banners todavía. Se muestran en la portada debajo del hero.
        </p>
      ) : (
        <div className="admin-banners-list">
          {banners.map((banner, index) => (
            <div key={banner.id} className="admin-banner-card">
              <div
                className="admin-banner-preview"
                style={{ backgroundImage: `url(${banner.imageUrl})` }}
              />
              <div className="admin-banner-info">
                <strong className={banner.active ? "" : "admin-banner-inactive"}>
                  {banner.title}
                </strong>
                {banner.subtitle && (
                  <span className="admin-cell-sub">{banner.subtitle}</span>
                )}
                <span className="admin-cell-sub">
                  Orden {banner.sortOrder}
                  {banner.href ? ` · ${banner.href}` : ""}
                  {banner.startsAt || banner.endsAt
                    ? ` · ${banner.startsAt ? toDateInput(banner.startsAt) : "…"} → ${
                        banner.endsAt ? toDateInput(banner.endsAt) : "…"
                      }`
                    : ""}
                </span>
              </div>
              <div className="admin-banner-actions">
                <span
                  className={`admin-status-badge ${
                    banner.active ? "available" : "unavailable"
                  }`}
                >
                  {banner.active ? "Activo" : "Pausado"}
                </span>
                <button
                  type="button"
                  className="admin-button small"
                  disabled={busy}
                  onClick={() => void run(() => toggleBannerActiveAction(banner.id))}
                >
                  {banner.active ? "Pausar" : "Activar"}
                </button>
                <button
                  type="button"
                  className="admin-button small"
                  disabled={busy}
                  onClick={() => setDraft(draftFromRow(banner))}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="admin-button small"
                  disabled={busy || index === 0}
                  onClick={() => void run(() => moveBannerAction(banner.id, "up"))}
                  aria-label="Subir"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-button small"
                  disabled={busy || index === banners.length - 1}
                  onClick={() => void run(() => moveBannerAction(banner.id, "down"))}
                  aria-label="Bajar"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="admin-button small danger"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(`¿Eliminar el banner "${banner.title}"?`)
                    ) {
                      void run(() => deleteBannerAction(banner.id));
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

      <p className="admin-field-hint">
        Los banners activos aparecen en la portada debajo del hero.{" "}
        <Link href="/">Ver portada</Link>
      </p>
    </div>
  );
}
