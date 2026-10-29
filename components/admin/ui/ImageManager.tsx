"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { fraunces } from "@/app/fonts";

interface ImageManagerProps {
  /** Color names that drive the buckets (empty → single "General" bucket). */
  colors: string[];
  /** photos JSON: { "Negro": ["https://…"] }. Extra keys are shown too. */
  photos: Record<string, string[]>;
  /** Cover image URL (product.photo). May be empty for new products. */
  cover: string;
  onPhotosChange: (photos: Record<string, string[]>) => void;
  onCoverChange: (cover: string) => void;
}

const GENERAL_BUCKET = "General";
const MAX_PER_BUCKET = 12;

/**
 * Per-color image manager for the admin product form. Uploads go straight
 * from the browser to Vercel Blob via /api/admin/upload. Supports drag
 * reordering, cover selection and per-bucket removal.
 */
export default function ImageManager({
  colors,
  photos,
  cover,
  onPhotosChange,
  onCoverChange,
}: ImageManagerProps) {
  const buckets = colors.length > 0 ? colors : [GENERAL_BUCKET];
  const extraKeys = Object.keys(photos).filter(
    (key) =>
      !buckets.some((b) => b.toLowerCase() === key.toLowerCase()) &&
      (photos[key]?.length ?? 0) > 0
  );
  const allBuckets = [...buckets, ...extraKeys];

  const firstBucket =
    allBuckets.find((b) => b !== GENERAL_BUCKET && (photos[b]?.length ?? 0) > 0) ??
    allBuckets[0];

  const [activeBucket, setActiveBucket] = useState<string>(firstBucket);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeList = photos[activeBucket] ?? [];

  const setBucketList = (bucket: string, list: string[]) => {
    const next = { ...photos };
    if (list.length > 0) {
      next[bucket] = list;
    } else {
      delete next[bucket];
    }
    onPhotosChange(next);
  };

  const handleFiles = async (files: FileList | null) => {
    const list = files ? Array.from(files) : [];
    if (list.length === 0) return;
    setError(null);
    setUploading(list.length);

    try {
      // Deterministic per-form folder; addRandomSuffix prevents collisions.
      const folder = `products/${crypto.randomUUID()}`;
      const uploaded: string[] = [];
      for (const file of list) {
        const blob = await upload(`${folder}/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/admin/upload",
        });
        uploaded.push(blob.url);
      }

      const current = photos[activeBucket] ?? [];
      setBucketList(activeBucket, [...current, ...uploaded].slice(0, MAX_PER_BUCKET));

      // Adopt the first upload as cover when none is set yet.
      if (!cover && uploaded.length > 0) {
        onCoverChange(uploaded[0]);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo subir la imagen";
      setError(message);
    } finally {
      setUploading(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeImage = (bucket: string, url: string) => {
    setBucketList(bucket, (photos[bucket] ?? []).filter((u) => u !== url));
    if (cover === url) {
      const remaining = Object.entries(photos)
        .flatMap(([key, list]) =>
          key === bucket ? list.filter((u) => u !== url) : list
        )
        .filter((u) => typeof u === "string" && u !== url);
      onCoverChange(remaining[0] ?? "");
    }
  };

  const reorder = (bucket: string, from: number, to: number) => {
    const list = [...(photos[bucket] ?? [])];
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
      return;
    }
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setBucketList(bucket, list);
  };

  const hasCover =
    cover !== "" && Object.values(photos).flat().includes(cover);

  return (
    <div className="admin-image-manager">
      <div className="admin-image-tabs" role="tablist" aria-label="Colores con imágenes">
        {allBuckets.map((bucket) => (
          <button
            key={bucket}
            type="button"
            role="tab"
            aria-selected={bucket === activeBucket}
            aria-controls="admin-image-grid"
            aria-label={`Imágenes de color ${bucket}`}
            className={`admin-image-tab ${bucket === activeBucket ? "active" : ""}`}
            onClick={() => setActiveBucket(bucket)}
          >
            {bucket}
            {(photos[bucket]?.length ?? 0) > 0 && (
              <span className="admin-image-tab-count">
                {photos[bucket].length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        id="admin-image-grid"
        role="tabpanel"
        aria-label={`Imágenes del color ${activeBucket}`}
        className="admin-image-grid"
        onDragOver={(e) => e.preventDefault()}
      >
        {activeList.map((url, index) => (
          <figure
            key={url}
            className={`admin-image-thumb ${cover === url ? "cover" : ""}`}
            draggable
            onDragStart={() => {
              dragIndex.current = index;
            }}
            onDragEnd={() => {
              dragIndex.current = null;
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex.current !== null) {
                reorder(activeBucket, dragIndex.current, index);
                dragIndex.current = null;
              }
            }}
          >
            <Image
              src={url}
              alt={`Imagen ${index + 1} de ${activeList.length} del color ${activeBucket}`}
              width={120}
              height={120}
              className="admin-image"
              unoptimized
            />
            <button
              type="button"
              className={`admin-image-cover-btn ${cover === url ? "is-cover" : ""}`}
              title={
                cover === url ? "Portada actual" : "Marcar como portada"
              }
              onClick={() => onCoverChange(cover === url ? "" : url)}
            >
              {cover === url ? "Portada" : "Hacer portada"}
            </button>
            <button
              type="button"
              className="admin-image-remove"
              aria-label={`Quitar imagen ${index + 1} de ${activeList.length} del color ${activeBucket}`}
              onClick={() => removeImage(activeBucket, url)}
            >
              ×
            </button>
          </figure>
        ))}

        {activeList.length === 0 && (
          <p className="admin-image-empty">
            Sin imágenes para {activeBucket}
          </p>
        )}
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}

      <div className="admin-image-upload-row">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          hidden
          onChange={(e) => {
            void handleFiles(e.target.files);
          }}
        />
        <button
          type="button"
          className="admin-button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading > 0}
        >
          {uploading > 0
            ? `Subiendo ${uploading} imagen(es)...`
            : `+ Subir imágenes para ${activeBucket}`}
        </button>
        <span className={`admin-image-hint ${fraunces.className}`}>
          Arrastrá para ordenar · máx. {MAX_PER_BUCKET} por color
          {!hasCover ? " · elegí una portada" : ""}
        </span>
      </div>
    </div>
  );
}
