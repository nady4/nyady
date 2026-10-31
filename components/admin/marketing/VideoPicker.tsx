"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { uploadAdminMedia } from "@/lib/marketing/blob-upload";

interface VideoPickerProps {
  /** media[0] = the .mp4 (https), media[1] = optional cover image. */
  media: string[];
  onChange: (urls: string[]) => void;
  productPhotoUrls: string[];
}

const MAX_VIDEO_MB = 60;

/**
 * Video picker for the composer (Instagram reels).
 *
 * A reel needs a single public .mp4 (H.264) — Meta downloads it from the
 * Blob URL — plus an optional cover image (used as the reel thumbnail and as
 * the Facebook post image).
 */
export default function VideoPicker({
  media,
  onChange,
  productPhotoUrls,
}: VideoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const videoUrl = media[0] ?? "";
  const coverUrl = media[1] ?? "";

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setError(null);

    if (!/^video\/mp4$/i.test(file.type)) {
      setError("El reel tiene que ser un .mp4 (H.264). Si tenés un .mov, convertilo con CapCut.");
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`El video supera los ${MAX_VIDEO_MB} MB. Recortalo un poco.`);
      return;
    }

    setUploading(true);
    try {
      const blob = await uploadAdminMedia(file, "social/reels/");
      onChange([blob.url, coverUrl].filter(Boolean));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el video");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const setCover = (url: string) => {
    if (!videoUrl) {
      setError("Primero subí el video del reel.");
      return;
    }
    onChange([videoUrl, url]);
  };

  return (
    <div className="admin-mkt-media">
      <div className="admin-mkt-media-controls">
        <button
          type="button"
          className="admin-button small primary"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "Subiendo…" : videoUrl ? "Reemplazar video" : "Subir video (.mp4)"}
        </button>
        <button
          type="button"
          className="admin-button small"
          onClick={() => setCover("")}
          disabled={!coverUrl}
        >
          Quitar portada
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4"
        hidden
        onChange={(e) => {
          void handleFile(e.target.files);
        }}
      />

      {videoUrl ? (
        <div className="admin-mkt-video">
          <video src={videoUrl} controls preload="metadata" />
          <p className="admin-cell-sub">Video del reel (máx. {MAX_VIDEO_MB} MB)</p>
        </div>
      ) : (
        <div className="admin-mkt-media-urlrow">
          <input
            type="url"
            className="admin-input"
            placeholder="O pegá la URL https del .mp4"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
          />
          <button
            type="button"
            className="admin-button small"
            onClick={() => {
              const url = manualUrl.trim();
              if (!/^https:\/\//.test(url)) {
                setError("La URL del video debe empezar con https://");
                return;
              }
              onChange([url, coverUrl].filter(Boolean));
              setManualUrl("");
              setError(null);
            }}
          >
            Usar URL
          </button>
        </div>
      )}

      <p className="admin-field-hint">
        <strong>Portada</strong> (opcional): se usa como miniatura del reel y
        como imagen del post de Facebook.
      </p>
      {productPhotoUrls.length > 0 && (
        <div className="admin-mkt-media-source">
          {productPhotoUrls.map((url) => (
            <button
              key={url}
              type="button"
              className={`admin-mkt-media-option ${coverUrl === url ? "selected" : ""}`}
              onClick={() => setCover(url)}
              aria-label="Usar esta imagen como portada"
            >
              <Image src={url} alt="" width={80} height={80} unoptimized />
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
