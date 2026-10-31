"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { uploadAdminImage } from "@/lib/marketing/blob-upload";

interface ImagePickerProps {
  /** Current image URL ("" = none). */
  value: string;
  onChange: (url: string) => void;
  /** Blob path prefix: "products/" or "banners/". */
  folder?: string;
  previewWidth?: number;
}

/**
 * Single-image picker backed by Vercel Blob (client upload via
 * /api/admin/upload). Accepts a pasted URL too, so existing external images
 * keep working.
 */
export default function ImagePicker({
  value,
  onChange,
  folder = "banners/",
  previewWidth = 260,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [manualDraft, setManualDraft] = useState("");

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const blob = await uploadAdminImage(file, folder);
      onChange(blob.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="admin-image-picker">
      {value ? (
        <figure className="admin-image-picker-preview">
          <Image
            src={value}
            alt="Imagen seleccionada"
            width={previewWidth}
            height={Math.round(previewWidth * 0.5)}
            unoptimized
            style={{ width: previewWidth, height: "auto", objectFit: "cover" }}
          />
          <button
            type="button"
            className="admin-image-remove"
            aria-label="Quitar imagen"
            onClick={() => onChange("")}
          >
            ×
          </button>
        </figure>
      ) : (
        <p className="admin-image-empty">Sin imagen seleccionada</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        hidden
        onChange={(e) => {
          void handleFiles(e.target.files);
        }}
      />

      <div className="admin-image-upload-row">
        <button
          type="button"
          className="admin-button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Subiendo..." : value ? "Reemplazar imagen" : "Subir imagen"}
        </button>
        <button
          type="button"
          className="admin-button"
          onClick={() => {
            setManual((v) => !v);
            setManualDraft(value);
          }}
        >
          {manual ? "Cerrar URL" : "Pegar URL"}
        </button>
      </div>

      {manual && (
        <label className="admin-field">
          <span>URL de la imagen</span>
          <input
            type="text"
            value={manualDraft}
            onChange={(e) => setManualDraft(e.target.value)}
            placeholder="https://…"
          />
          <button
            type="button"
            className="admin-button small"
            onClick={() => {
              onChange(manualDraft.trim());
              setManual(false);
            }}
          >
            Usar URL
          </button>
        </label>
      )}

      {error && <p className="admin-error" role="alert">{error}</p>}
    </div>
  );
}
