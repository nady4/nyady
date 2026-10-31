"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { uploadAdminImage } from "@/lib/marketing/blob-upload";
import {
  createMarketingAssetAction,
  deleteMarketingAssetAction,
  updateMarketingAssetAction,
} from "@/actions/admin/marketing";
import type { AdminActionResult, MarketingAssetRow } from "@/types/admin";

export default function AssetsAdmin({ assets }: { assets: MarketingAssetRow[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [manualTag, setManualTag] = useState("");
  const [tagsInEdit, setTagsInEdit] = useState<Record<string, string>>({});

  const flash = (m: { kind: "ok" | "error"; text: string }) => {
    setMessage(m);
    if (m.kind === "ok") setTimeout(() => setMessage(null), 2500);
  };

  const run = async (action: () => Promise<AdminActionResult>, okText = "Listo") => {
    setMessage(null);
    setBusy(true);
    try {
      const result = await action();
      if (result.ok) {
        flash({ kind: "ok", text: okText });
        router.refresh();
      } else {
        flash({ kind: "error", text: result.error ?? "No se pudo completar" });
      }
    } catch {
      flash({ kind: "error", text: "Error de conexión. Reintentá." });
    } finally {
      setBusy(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const blob = await uploadAdminImage(file, "social/");
      const createResult = await createMarketingAssetAction(blob.url, null, "");
      if (!createResult.ok) {
        flash({ kind: "error", text: createResult.error ?? "No se pudo registrar la imagen" });
        return;
      }
      flash({ kind: "ok", text: "Imagen guardada. Asignale una etiqueta si querés." });
      router.refresh();
    } catch (err) {
      flash({
        kind: "error",
        text: err instanceof Error ? err.message : "No se pudo subir",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addManual = () => {
    const url = manualUrl.trim();
    if (!/^https?:\/\//.test(url)) {
      flash({ kind: "error", text: "Pegá una URL https:// válida" });
      return;
    }
    void run(
      () => createMarketingAssetAction(url, null, manualTag.trim() || null),
      "Imagen agregada"
    ).then(() => {
      setManualUrl("");
      setManualTag("");
    });
  };

  return (
    <div className="admin-mkt-assets">
      {message && (
        <p
          className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}
          role={message.kind === "ok" ? "status" : "alert"}
        >
          {message.text}
        </p>
      )}

      <div className="admin-mkt-assets-toolbar">
        <button
          type="button"
          className="admin-button primary"
          disabled={uploading || busy}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "Subiendo..." : "+ Subir imagen"}
        </button>
        <div className="admin-mkt-assets-manual">
          <input
            type="url"
            className="admin-input"
            placeholder="https://… (pegar URL)"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
          />
          <input
            type="text"
            className="admin-input"
            placeholder="Etiqueta (opcional)"
            value={manualTag}
            maxLength={40}
            onChange={(e) => setManualTag(e.target.value)}
          />
          <button
            type="button"
            className="admin-button"
            disabled={busy || !manualUrl.trim()}
            onClick={addManual}
          >
            Agregar URL
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        hidden
        onChange={(e) => {
          void handleFiles(e.target.files);
        }}
      />

      {assets.length === 0 ? (
        <p className="admin-empty">
          Biblioteca vacía. Subí fotos de campaña o pegá URLs para reusarlas en tus posts.
        </p>
      ) : (
        <div className="admin-mkt-assets-grid">
          {assets.map((asset) => (
            <div key={asset.id} className="admin-mkt-asset-card">
              <Image
                className="admin-mkt-asset-img"
                src={asset.url}
                alt={asset.tag ?? "Imagen de marketing"}
                width={200}
                height={200}
                unoptimized
              />
              <div className="admin-mkt-asset-info">
                <input
                  type="text"
                  className="admin-input admin-mkt-asset-tag"
                  placeholder="Etiqueta (ej. invierno)"
                  maxLength={40}
                  defaultValue={asset.tag ?? ""}
                  key={asset.id}
                  onChange={(e) =>
                    setTagsInEdit((prev) => ({ ...prev, [asset.id]: e.target.value }))
                  }
                />
                <span className="admin-cell-sub">{asset.createdAtText}</span>
              </div>
              <div className="admin-mkt-asset-actions">
                <button
                  type="button"
                  className="admin-button small"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        updateMarketingAssetAction(
                          asset.id,
                          tagsInEdit[asset.id] ?? asset.tag ?? ""
                        ),
                      "Etiqueta guardada"
                    )
                  }
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className="admin-button small danger"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("¿Quitar esta imagen de la biblioteca?")) {
                      void run(() => deleteMarketingAssetAction(asset.id), "Imagen eliminada");
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
