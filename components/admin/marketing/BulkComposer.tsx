"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type BulkCreateOutcome,
  type BulkPhotoMode,
  createBulkPostsAction,
} from "@/actions/admin/marketing";
import { formatARS } from "@/lib/admin/format";

export interface BulkProductOption {
  id: string;
  name: string;
  price: number;
  category: string;
  photo: string;
  photoUrls: string[];
  colors: string[];
  sizes: string[];
  slug: string;
}

interface BulkTemplateOption {
  id: string;
  name: string;
  body: string;
}

interface BulkComposerProps {
  products: BulkProductOption[];
  templates: BulkTemplateOption[];
  siteUrl: string;
}

type BodyMode = "template" | "custom";

const PHOTO_MODES: { value: BulkPhotoMode; label: string; hint: string }[] = [
  { value: "all", label: "Todas las fotos (≤10)", hint: "portada primero, orden por colores" },
  { value: "cover_per_color", label: "Portada + 1 por color", hint: "una representativa por color" },
  { value: "cover_only", label: "Solo portada", hint: "post minimal, agregás fotos después" },
];

const PHOTOS_PER_POST_LIMIT = 10;
const PRODUCTS_PER_BATCH_LIMIT = 25;

function fillTemplate(
  templateBody: string,
  product: BulkProductOption,
  siteUrl: string
): string {
  return templateBody
    .split("{producto}")
    .join(product.name)
    .split("{precio}")
    .join(formatARS(product.price))
    .split("{link}")
    .join(`${siteUrl}/products/${product.slug}`)
    .split("{tallas}")
    .join(product.sizes.join(", ") || "-")
    .split("{colores}")
    .join(product.colors.join(", ") || "-");
}

/**
 * Bulk composer: one IG/FB draft per product with the product's own photo
 * set, a shared description template (real data injected) and optional AI
 * polish. Selection works with a searchable filter + select-all.
 */
export default function BulkComposer({
  products,
  templates,
  siteUrl,
}: BulkComposerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bodyMode, setBodyMode] = useState<BodyMode>(
    templates.length > 0 ? "template" : "custom"
  );
  const [templateId, setTemplateId] = useState<string>(
    templates[0]?.id ?? ""
  );
  const [customText, setCustomText] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [tone, setTone] = useState(0);
  const [photoMode, setPhotoMode] = useState<BulkPhotoMode>("all");
  const [channels, setChannels] = useState<Array<"instagram" | "facebook">>([
    "instagram",
  ]);
  const [campaign, setCampaign] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );
  const [outcome, setOutcome] = useState<BulkCreateOutcome | null>(null);

  const categories = useMemo(
    () =>
      [...new Set(products.map((p) => p.category))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [products]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (
        term &&
        !p.name.toLowerCase().includes(term) &&
        !p.category.toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [products, search, category]);

  // countPhotos helper mirrors the server-side photo-mode selection so the
  // UI can warn about the IG ≤10 cap before anything is created.
  const photoSummary = useMemo(() => {
    let min = Number.POSITIVE_INFINITY;
    let overLimit = 0;
    for (const id of selectedIds) {
      const product = products.find((p) => p.id === id);
      if (!product) continue;
      const count =
        photoMode === "cover_only" ? 1 : Math.min(product.photoUrls.length, PHOTOS_PER_POST_LIMIT);
      if (count < min) min = count;
      if (product.photoUrls.length > PHOTOS_PER_POST_LIMIT) overLimit += 1;
    }
    return { min, overLimit };
  }, [selectedIds, products, photoMode]);

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length >= PRODUCTS_PER_BATCH_LIMIT
          ? prev
          : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const merged = [...new Set([...prev, ...filtered.map((p) => p.id)])];
      return merged.slice(0, PRODUCTS_PER_BATCH_LIMIT);
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const create = async () => {
    setMessage(null);
    setOutcome(null);
    if (selectedIds.length === 0) {
      setMessage({ kind: "error", text: "Elegí al menos un producto" });
      return;
    }
    if (bodyMode === "custom" && !customText.trim()) {
      setMessage({
        kind: "error",
        text: "Escribí el texto libre o cambiá a plantilla",
      });
      return;
    }
    if (channels.length === 0) {
      setMessage({ kind: "error", text: "Elegí al menos un canal" });
      return;
    }
    setBusy(true);
    try {
      const result = await createBulkPostsAction({
        productIds: selectedIds,
        templateId: bodyMode === "template" ? templateId || null : null,
        customBody: bodyMode === "custom" ? customText : "",
        useAi,
        tone,
        photoMode,
        hasChannels: channels as ("facebook" | "instagram")[],
        campaign: campaign.trim() || defaultCampaignName(),
      });
      if (result.ok) {
        setOutcome(result);
        setMessage({
          kind: "ok",
          text: `Listo: ${result.created ?? 0} borradores creados.`,
        });
        router.refresh();
      } else {
        setMessage({ kind: "error", text: result.error ?? "No se pudo crear" });
      }
    } catch {
      setMessage({ kind: "error", text: "Error de conexión. Reintentá." });
    } finally {
      setBusy(false);
    }
  };

  function defaultCampaignName(): string {
    return `Bulk ${new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}`;
  }

  return (
    <div className="admin-mkt-bulk">
      {message && (
        <p
          className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}
          role={message.kind === "ok" ? "status" : "alert"}
        >
          {message.text}
        </p>
      )}

      <div className="admin-card">
        <h3 className="admin-card-title">1 · Productos ({selectedIds.length}/{PRODUCTS_PER_BATCH_LIMIT})</h3>
        <div className="admin-mkt-bulk-toolbar">
          <input
            type="search"
            className="admin-input"
            placeholder="Buscar producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="admin-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="admin-button small"
            onClick={selectAllFiltered}
            disabled={filtered.length === 0}
          >
            Seleccionar visibles ({filtered.length})
          </button>
          <button
            type="button"
            className="admin-button small"
            onClick={clearSelection}
            disabled={selectedIds.length === 0}
          >
            Limpiar selección
          </button>
        </div>

        <div className="admin-mkt-bulk-products">
          {filtered.length === 0 && (
            <p className="admin-empty">Sin resultados con ese filtro.</p>
          )}
          {filtered.map((product) => {
            const checked = selectedIds.includes(product.id);
            return (
              <label
                key={product.id}
                className={`admin-mkt-bulk-product ${checked ? "selected" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleProduct(product.id)}
                />
                <Image src={product.photo} alt="" width={40} height={40} unoptimized />
                <span>
                  <strong>{product.name}</strong>
                  <span className="admin-cell-sub">
                    {formatARS(product.price)} · {product.photoUrls.length} foto(s) ·{" "}
                    {product.colors.length} color(es)
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="admin-card">
        <h3 className="admin-card-title">2 · Descripción</h3>
        <div className="admin-mkt-bulk-bodyise">
          <label className="admin-field admin-field-checkbox">
            <input
              type="radio"
              name="admin-mkt-bulk-bodymode"
              checked={bodyMode === "template"}
              onChange={() => setBodyMode("template")}
              disabled={templates.length === 0}
            />
            <span>Plantilla de la biblioteca</span>
          </label>
          <label className="admin-field admin-field-checkbox">
            <input
              type="radio"
              name="admin-mkt-bulk-bodymode"
              checked={bodyMode === "custom"}
              onChange={() => setBodyMode("custom")}
            />
            <span>Texto libre (con placeholders)</span>
          </label>
        </div>

        {bodyMode === "template" && templates.length > 0 ? (
          <label className="admin-field">
            <span>Plantilla</span>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <textarea
              rows={3}
              readOnly
              value={templates.find((t) => t.id === templateId)?.body ?? ""}
            />
          </label>
        ) : null}

        {bodyMode === "custom" ? (
          <label className="admin-field">
            <span>Texto (placeholders: {`{producto} {precio} {link} {tallas} {colores}`})</span>
            <textarea
              rows={5}
              value={customText}
              maxLength={3000}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={"{producto} ya está disponible 🙌\n{tallas} disponibles\n{precio} · {link}"}
            />
          </label>
        ) : null}

        {selectedIds.length > 0 &&
          !useAi &&
          selectedIds.slice(0, 1).map((id) => {
            const first = products.find((p) => p.id === id);
            if (!first) return null;
            const bodyText =
              bodyMode === "template"
                ? templates.find((t) => t.id === templateId)?.body ?? ""
                : customText;
            const preview = fillTemplate(bodyText, first, siteUrl);
            return (
              <div key={id} className="admin-mkt-bulk-preview">
                <span>Preview con “{first.name}”:</span>
                <p>{preview || "(texto vacío)"}</p>
              </div>
            );
          })}

        <label className="admin-field admin-field-checkbox">
          <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
          <span>Personalizar con IA (1 request por producto, OpenCode Go)</span>
        </label>
        {useAi && (
          <label className="admin-field">
            <span>Tono IA</span>
            <select value={tone} onChange={(e) => setTone(Number(e.target.value))}>
              <option value={0}>Directo y cercano</option>
              <option value={1}>Aspiracional / editorial</option>
              <option value={2}>Promo con urgencia</option>
            </select>
          </label>
        )}
      </div>

      <div className="admin-card">
        <h3 className="admin-card-title">3 · Fotos, canales y guardado</h3>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Modo de fotos</span>
            <select
              value={photoMode}
              onChange={(e) => setPhotoMode(e.target.value as BulkPhotoMode)}
            >
              {PHOTO_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
            <p className="admin-field-hint">{PHOTO_MODES.find((m) => m.value === photoMode)?.hint}</p>
          </label>
          <label className="admin-field">
            <span>Canales</span>
            <div className="admin-mkt-channel-buttons">
              {["instagram", "facebook"].map((channel) => {
                const checked = channels.includes(channel as "instagram");
                return (
                  <button
                    key={channel}
                    type="button"
                    className={`admin-mkt-channel-btn ${checked ? "checked" : ""}`}
                    aria-pressed={checked}
                    onClick={() =>
                      setChannels((prev) =>
                        checked
                          ? prev.filter((c) => c !== channel)
                          : [...prev, channel as "instagram"]
                      )
                    }
                  >
                    {checked ? "✓ " : ""}
                    {channel === "instagram" ? "Instagram" : "Facebook"}
                  </button>
                );
              })}
            </div>
          </label>
          <label className="admin-field">
            <span>Campaña</span>
            <input
              type="text"
              placeholder={defaultCampaignName()}
              value={campaign}
              maxLength={60}
              onChange={(e) => setCampaign(e.target.value)}
            />
          </label>
        </div>

        {selectedIds.length > 0 && photoSummary.overLimit > 0 && (
          <p className="admin-field-hint">
            {photoSummary.overLimit} producto(s) superan {PHOTOS_PER_POST_LIMIT} fotos:
            se usan las primeras {PHOTOS_PER_POST_LIMIT} y el resto podés cargarlas
            después desde el composer.
          </p>
        )}

        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-button primary"
            disabled={busy || selectedIds.length === 0}
            onClick={() => void create()}
          >
            {busy
              ? "Creando borradores…"
              : `Crear ${selectedIds.length} borrador(es)`}
          </button>
          <Link href="/admin/marketing" className="admin-button">
            Volver a Marketing
          </Link>
        </div>

        {outcome && (
          <div className="admin-mkt-bulk-outcome">
            <strong>Resultado</strong>
            <ul>
              {(outcome.results ?? []).map((result, index) => (
                <li key={`${result.productId}-${index}`}>
                  {result.postId ? "✓" : "⚠"} {result.productName}
                  {result.error ? ` — ${result.error}` : ""}
                </li>
              ))}
              {(outcome.skipped ?? []).map((s, index) => (
                <li key={`${s.productId}-skip-${index}`}>
                  ⏭ {s.reason} (id {s.productId.slice(0, 8)}…)
                </li>
              ))}
            </ul>
            <p className="admin-field-hint">
              <Link href="/admin/marketing">Ver los borradores en Posteos</Link> (filtra
              por la campaña elegida; publicá con “Publicar ahora” o dejá que el cron
              publique cuando la programás).
            </p>
          </div>
        )}
      </div>

      <p className="admin-field-hint">
        Limitaciones de la API: carousel ≤10 fotos (cada carousel cuenta como 1 post), caption ≤
        2200 caracteres, JPEG ≤8MB, ~100 posts por cuenta/24h; todas las imágenes se convierten
        automáticamente a JPEG al publicar (las que son png/webp pasan por sharp),
        así las fotos procedentes del catálogo no rompen el publish de Instagram.
      </p>
    </div>
  );
}
