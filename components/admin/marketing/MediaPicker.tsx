"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";

interface MediaPickerProps {
  media: string[];
  onChange: (urls: string[]) => void;
  productPhotoUrls: string[];
  assets: { id: string; url: string; tag: string | null }[];
}

type SourceKey = "product" | "library" | "url";

/**
 * Multi-image picker for the composer. media[0] is the cover; reorder with
 * ↑/↓ (same pattern the banners list uses). Uploads go to the social/ Blob
 * prefix through /api/admin/upload.
 */

export default function MediaPicker({
  media,
  onChange,
  productPhotoUrls,
  assets,
}: MediaPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [source, setSource] = useState<SourceKey | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = (url: string) => {
    const clean = url.trim();
    if (!clean) return;
    if (!/^https?:\/\//.test(clean) && !clean.startsWith("/")) {
      setError("URL inválida (debe empezar con https://)");
      return;
    }
    if (media.includes(clean)) {
      setError("Esa imagen ya está en el post");
      return;
    }
    if (media.length >= 10) {
      setError("Máximo 10 imágenes por post");
      return;
    }
    setError(null);
    onChange([...media, clean]);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    if (media.length >= 10) {
      setError("Máximo 10 imágenes por post");
      return;
    }
    setUploading(true);
    try {
      const blob = await upload(`social/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/upload",
      });
      onChange([...media, blob.url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="admin-mkt-media">
      <div className="admin-mkt-media-controls">
        <button
          type="button"
          className="admin-button small"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "Subiendo..." : "Subir foto"}
        </button>
        <button
          type="button"
          className="admin-button small"
          onClick={() => setSource(source === "product" ? null : "product")}
          disabled={productPhotoUrls.length === 0}
          title={productPhotoUrls.length === 0 ? "Elegí un producto primero" : ""}
        >
          Del producto
        </button>
        <button
          type="button"
          className="admin-button small"
          onClick={() => setSource(source === "library" ? null : "library")}
          disabled={assets.length === 0}
        >
          Biblioteca ({assets.length})
        </button>
        <button
          type="button"
          className="admin-button small"
          onClick={() => setSource(source === "url" ? null : "url")}
        >
          Pegar URL
        </button>
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

      {source === "product" && (
        <div className="admin-mkt-media-source">
          {productPhotoUrls.map((url) => (
            <button
              key={url}
              type="button"
              className={`admin-mkt-media-option ${media.includes(url) ? "selected" : ""}`}
              onClick={() => add(url)}
              aria-label="Agregar imagen del producto"
            >
              <Image src={url} alt="" width={80} height={80} unoptimized />
            </button>
          ))}
        </div>
      )}

      {source === "library" && (
        <div className="admin-mkt-media-source">
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className={`admin-mkt-media-option ${media.includes(asset.url) ? "selected" : ""}`}
              onClick={() => add(asset.url)}
              title={asset.tag ?? ""}
              aria-label="Agregar imagen de la biblioteca"
            >
              <Image src={asset.url} alt="" width={80} height={80} unoptimized />
            </button>
          ))}
        </div>
      )}

      {source === "url" && (
        <div className="admin-mkt-media-urlrow">
          <input
            type="url"
            className="admin-input"
            placeholder="https://…"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
          />
          <button
            type="button"
            className="admin-button small"
            onClick={() => {
              add(manualUrl);
              setManualUrl("");
            }}
          >
            Agregar
          </button>
        </div>
      )}

      {error && <p className="admin-error" role="alert">{error}</p>}

      {media.length === 0 ? (
        <p className="admin-field-hint">
          Sin imágenes todavía. La primera cuenta como portada del post.
        </p>
      ) : (
        <div className="admin-mkt-media-list">
          {media.map((url, index) => (
            <div key={url} className={`admin-mkt-media-item ${index === 0 ? "cover" : ""}`}>
              <Image src={url} alt="" width={72} height={72} unoptimized />
              <span className="admin-mkt-media-role">
                {index === 0 ? "Portada" : `#${index + 1}`}
              </span>
              <div className="admin-mkt-media-actions">
                <button
                  type="button"
                  className="admin-button small"
                  disabled={index === 0}
                  aria-label="Subir"
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-button small"
                  disabled={index === media.length - 1}
                  aria-label="Bajar"
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="admin-button small danger"
                  aria-label="Quitar"
                  onClick={() => onChange(media.filter((m) => m !== url))}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
