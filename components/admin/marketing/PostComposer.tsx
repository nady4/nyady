"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import TagInput from "@/components/admin/ui/TagInput";
import MediaPicker from "@/components/admin/marketing/MediaPicker";
import AiCopyPanel from "@/components/admin/marketing/AiCopyPanel";
import PostPreview from "@/components/admin/marketing/PostPreview";
import {
  createMarketingPostAction,
  publishMarketingPostAction,
  searchMarketingProductsAction,
  updateMarketingPostAction,
} from "@/actions/admin/marketing";
import { formatARS } from "@/lib/admin/format";
import type { CopyVariant } from "@/lib/marketing/ai";
import type {
  AdminActionResult,
  MarketingProductOption,
  MarketingSettingsState,
  MarketingTemplateRow,
  MetaConnectionState,
} from "@/types/admin";

const CHANNELS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;

const CHANNEL_HINTS: Record<string, string> = {
  instagram: "Captions hasta ~2200 caracteres. Los links no se pueden clickear: usá “link en bio”.",
  facebook: "Sin límite de caption práctico. El link es clickeable y genera preview.",
  whatsapp: "Mensaje corto y directo. El link se copia aparte y compartís manual (Fase 4: envío automático).",
};

export interface ComposerInitial {
  id: string | null;
  title: string;
  body: string;
  hashtags: string[];
  channels: string[];
  media: string[];
  productId: string | null;
  campaign: string;
  scheduledAt: string;
  status: "draft" | "ready";
}

interface PostComposerProps {
  initial: ComposerInitial;
  products: MarketingProductOption[];
  templates: MarketingTemplateRow[];
  assets: { id: string; url: string; tag: string | null }[];
  campaigns: string[];
  settings: MarketingSettingsState;
  siteUrl: string;
  connection: MetaConnectionState;
}

interface ComposerState {
  title: string;
  body: string;
  hashtags: string[];
  channels: string[];
  media: string[];
  productId: string | null;
  campaign: string;
  scheduledAt: string;
  status: "draft" | "ready";
}

function composeText(state: ComposerState, product: MarketingProductOption | null, siteUrl: string): string {
  const parts: string[] = [state.body.trim()];
  if (state.hashtags.length > 0) {
    parts.push(state.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "));
  }
  if (product) parts.push(`${siteUrl}/products/${product.slug}`);
  return parts.filter(Boolean).join("\n\n");
}

export default function PostComposer({
  initial,
  products,
  templates,
  assets,
  campaigns,
  settings,
  siteUrl,
  connection,
}: PostComposerProps) {
  const router = useRouter();
  const [state, setState] = useState<ComposerState>({
    title: initial.title,
    body: initial.body,
    hashtags: initial.hashtags,
    channels: initial.channels,
    media: initial.media,
    productId: initial.productId,
    campaign: initial.campaign,
    scheduledAt: initial.scheduledAt,
    status: initial.status,
  });
  const [productFinder, setProductFinder] = useState("");
  const [productResults, setProductResults] = useState<MarketingProductOption[] | null>(null);
  const [finderBusy, setFinderBusy] = useState(false);
  const [previewChannel, setPreviewChannel] = useState<string>("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [publishState, setPublishState] = useState<{
    busy: boolean;
    message: string | null;
    ok: boolean;
  }>({ busy: false, message: null, ok: false });

  const publishNow = async () => {
    if (!initial.id) return;
    setPublishState({ busy: true, message: "Publicando en Meta…", ok: false });
    try {
      const result = await publishMarketingPostAction(initial.id);
      if (result.ok && result.results) {
        const parts: string[] = [];
        if (result.results.facebook) {
          parts.push(
            result.results.facebook.ok
              ? "Facebook publicado"
              : `Facebook: ${result.results.facebook.error ?? "fallo"}`
          );
        }
        if (result.results.instagram) {
          parts.push(
            result.results.instagram.ok
              ? "Instagram publicado"
              : `Instagram: ${result.results.instagram.error ?? "fallo"}`
          );
        }
        setPublishState({
          busy: false,
          message: parts.join(" · "),
          ok: parts.some((p) => p === "Facebook publicado" || p === "Instagram publicado"),
        });
      } else {
        setPublishState({
          busy: false,
          message: result.error ?? "No se pudo publicar",
          ok: false,
        });
      }
    } catch {
      setPublishState({ busy: false, message: "Error de conexión. Reintentá.", ok: false });
    }
  };

  const selectedProduct = useMemo(
    () =>
      state.productId
        ? [
            ...products,
            ...(productResults ?? []),
          ].find((p) => p.id === state.productId) ?? null
        : null,
    [state.productId, products, productResults]
  );

  // Debounced product search through the server action.
  useEffect(() => {
    const term = productFinder.trim();
    const timer = setTimeout(() => {
      if (term.length < 2) {
        setProductResults(null);
        return;
      }
      setFinderBusy(true);
      searchMarketingProductsAction(term)
        .then((result) => {
          if (result.ok) setProductResults(result.products ?? []);
        })
        .catch(() => setProductResults(null))
        .finally(() => setFinderBusy(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [productFinder]);

  const finderList = productFinder.trim().length >= 2 ? (productResults ?? []) : products;

  const channelPreview = state.channels.some((c) => c === previewChannel)
    ? previewChannel
    : state.channels[0] ?? "instagram";

  const applyVariant = (variant: CopyVariant) => {
    let body = variant.body.trim();
    if (variant.hook.trim() && !body.toLowerCase().startsWith(variant.hook.trim().toLowerCase())) {
      body = `${variant.hook.trim()}\n\n${body}`;
    }
    if (variant.cta.trim() && !body.includes(variant.cta.trim().slice(0, 40))) {
      body = `${body}\n\n${variant.cta.trim()}`;
    }
    setState((prev) => ({
      ...prev,
      body,
      hashtags: Array.from(
        new Set([
          ...prev.hashtags,
          ...variant.hashtags.map((h) => h.trim().replace(/^#/, "")),
        ])
      ).slice(0, 30),
    }));
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const p = selectedProduct;
    const replacements: Record<string, string> = {
      producto: p?.name ?? "{producto}",
      precio: p ? formatARS(p.price) : "{precio}",
      link: p ? `${siteUrl}/products/${p.slug}` : "{link}",
      tallas: p && p.sizes.length > 0 ? p.sizes.join(", ") : "{tallas}",
      colores: p && p.colors.length > 0 ? p.colors.join(", ") : "{colores}",
    };
    let body = template.body;
    for (const [key, value] of Object.entries(replacements)) {
      body = body.split(`{${key}}`).join(value);
    }
    setState((prev) => ({
      ...prev,
      body,
      hashtags: Array.from(
        new Set([...prev.hashtags, ...template.hashtags])
      ).slice(0, 30),
      title: prev.title || template.name,
    }));
  };

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setSaveError("No se pudo copiar. Seleccioná el texto manualmente.");
    }
  };

  const buildInput = (status: "draft" | "ready") => ({
    title: state.title,
    body: state.body,
    hashtags: state.hashtags,
    channels: state.channels,
    media: state.media,
    productId: state.productId,
    campaign: state.campaign || null,
    status,
    scheduledAt: state.scheduledAt
      ? new Date(state.scheduledAt).toISOString()
      : null,
  });

  const save = async (status: "draft" | "ready"): Promise<string | null> => {
    setSaveError(null);
    if (!state.title.trim()) {
      setSaveError("Falta el título interno del post");
      return null;
    }
    if (!state.body.trim()) {
      setSaveError("Escribí el copy del post");
      return null;
    }
    if (state.channels.length === 0) {
      setSaveError("Elegí al menos un canal");
      return null;
    }
    setSaving(true);
    try {
      const result: AdminActionResult & { postId?: string } = initial.id
        ? await updateMarketingPostAction(initial.id, buildInput(status))
        : await createMarketingPostAction(buildInput(status));
      if (result.ok && result.postId) {
        if (!initial.id) {
          // New post: keep the user on the page (URL mirrors the created
          // post) so they can publish it right away with the next click.
          window.history.replaceState(null, "", `/admin/marketing/${result.postId}`);
          setSavedNote("Guardado ✓");
        } else {
          setSavedNote("Cambios guardados ✓");
        }
        return result.postId;
      }
      if (result.ok) return initial.id ?? null;
      setSaveError(result.error ?? "No se pudo guardar");
      return null;
    } catch {
      setSaveError("Error de conexión. Reintentá.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  /** Create/update + immediate Meta publish in one click (draft included). */
  const saveAndPublish = async () => {
    const postId = await save("ready");
    if (!postId) return;
    setPublishState({ busy: true, message: "Publicando en Meta…", ok: false });
    try {
      const result = await publishMarketingPostAction(postId);
      if (result.ok && result.results) {
        const parts: string[] = [];
        for (const [channel, outcome] of Object.entries(result.results)) {
          if (!outcome) continue;
          parts.push(
            outcome.ok
              ? `${channel === "facebook" ? "Facebook" : "Instagram"} publicado`
              : `${channel === "facebook" ? "Facebook" : "Instagram"}: ${outcome.error ?? "fallo"}`
          );
        }
        setPublishState({
          busy: false,
          message: parts.length > 0 ? parts.join(" · ") : "Publicación enviada",
          ok: parts.some((p) => p.includes("publicado")),
        });
        router.refresh();
      } else {
        setPublishState({
          busy: false,
          message: result.error ?? "No se pudo publicar",
          ok: false,
        });
      }
    } catch {
      setPublishState({ busy: false, message: "Error publicando. Reintentá.", ok: false });
    }
  };

  const waShareUrl = () => {
    const text = composeText(state, selectedProduct, siteUrl);
    const phone = settings.whatsappPhone?.replace(/[^\d]/g, "") ?? "";
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="admin-mkt-composer">
      {initial.id ? (
        <Link href="/admin/marketing" className="admin-mkt-backlink">
          ← Volver a Marketing
        </Link>
      ) : null}

      <div className="admin-mkt-composer-grid">
        <div>
          <div className="admin-card">
            <h3 className="admin-card-title">Post</h3>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>Título interno</span>
                <input
                  type="text"
                  value={state.title}
                  maxLength={120}
                  onChange={(e) => setState({ ...state, title: e.target.value })}
                  placeholder="Invierno · taco blanco"
                  required
                />
              </label>
              <label className="admin-field">
                <span>Campaña (opcional)</span>
                <input
                  type="text"
                  list="admin-mkt-campaigns"
                  value={state.campaign}
                  maxLength={60}
                  onChange={(e) => setState({ ...state, campaign: e.target.value })}
                  placeholder="Invierno 2026"
                />
                <datalist id="admin-mkt-campaigns">
                  {campaigns.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
            </div>

            <div className="admin-form-grid">
              <label className="admin-field">
                <span>Fecha programada (informativa en esta fase)</span>
                <input
                  type="datetime-local"
                  value={state.scheduledAt}
                  onChange={(e) => setState({ ...state, scheduledAt: e.target.value })}
                />
              </label>
            </div>

            <div className="admin-mkt-channel-picker">
              <span>Canales</span>
              <div className="admin-mkt-channel-buttons">
                {CHANNELS.map((channel) => {
                  const checked = state.channels.includes(channel.value);
                  return (
                    <button
                      key={channel.value}
                      type="button"
                      className={`admin-mkt-channel-btn ${checked ? "checked" : ""}`}
                      aria-pressed={checked}
                      onClick={() =>
                        setState({
                          ...state,
                          channels: checked
                            ? state.channels.filter((c) => c !== channel.value)
                            : [...state.channels, channel.value],
                        })
                      }
                    >
                      {checked ? "✓ " : ""}
                      {channel.label}
                    </button>
                  );
                })}
              </div>
              <p className="admin-field-hint">{CHANNEL_HINTS[channelPreview]}</p>
            </div>
          </div>

          <div className="admin-card">
            <h3 className="admin-card-title">Copy</h3>
            {templates.length > 0 && (
              <label className="admin-field">
                <span>Aplicar plantilla</span>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) applyTemplate(e.target.value);
                  }}
                >
                  <option value="">Elegir plantilla…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="admin-field">
              <span>Texto del post</span>
              <textarea
                rows={9}
                value={state.body}
                maxLength={4000}
                onChange={(e) => setState({ ...state, body: e.target.value })}
                placeholder="Escribí el copy o generalo con IA; también podés aplicar una plantilla."
              />
            </label>
            <div className="admin-mkt-copy-tools">
              <button
                type="button"
                className="admin-button small"
                onClick={() => void copyText("full", composeText(state, selectedProduct, siteUrl))}
              >
                {copied === "full" ? "¡Copiado!" : "Copiar texto completo"}
              </button>
              {state.channels.includes("whatsapp") && (
                <>
                  <a className="admin-button small" href={waShareUrl()} target="_blank" rel="noreferrer noopener">
                    Compartir por WhatsApp
                  </a>
                  <button
                    type="button"
                    className="admin-button small"
                    onClick={() => void copyText("wa", composeText(state, selectedProduct, siteUrl))}
                  >
                    {copied === "wa" ? "¡Copiado!" : "Copiar para WhatsApp"}
                  </button>
                </>
              )}
            </div>
            <TagInput
              label="Hashtags"
              values={state.hashtags}
              datalistId="admin-mkt-hashtag-sugs"
              onChange={(values) => setState({ ...state, hashtags: values })}
              placeholder="sandalias y Enter (se agregan con #)"
            />
            <datalist id="admin-mkt-hashtag-sugs">
              {settings.defaultHashtags.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
          </div>

          <div className="admin-card">
            <h3 className="admin-card-title">Imágenes</h3>
            <MediaPicker
              media={state.media}
              onChange={(urls) => setState({ ...state, media: urls })}
              productPhotoUrls={selectedProduct?.photoUrls ?? []}
              assets={assets}
            />
          </div>

          <div className="admin-form-actions admin-mkt-savebar">
            {initial.id && (
              <div className="admin-mkt-publishbar">
                <button
                  type="button"
                  className="admin-button primary"
                  disabled={
                    publishState.busy ||
                    saving ||
                    !state.channels.some((c) => c === "facebook" || c === "instagram") ||
                    (!connection.facebook.connected && !connection.instagram.connected)
                  }
                  onClick={() => void publishNow()}
                >
                  {publishState.busy ? "Publicando…" : "Publicar"}
                </button>
                {publishState.message && (
                  <p
                    className={
                      publishState.ok
                        ? "admin-saved-hint"
                        : "admin-error"
                    }
                    role={publishState.ok ? "status" : "alert"}
                  >
                    {publishState.message}
                  </p>
                )}
              </div>
            )}
            {saveError && <p className="admin-error" role="alert">{saveError}</p>}
            {savedNote && !saveError && (
              <p className="admin-saved-hint" role="status">{savedNote}</p>
            )}
            <div className="admin-mkt-savebar-buttons">
              <button
                type="button"
                className="admin-button"
                disabled={saving}
                onClick={() => void save("draft")}
              >
                {saving ? "Guardando..." : "Guardar borrador"}
              </button>
              <button
                type="button"
                className="admin-button primary"
                disabled={saving || publishState.busy}
                onClick={() => void saveAndPublish()}
              >
                {saving || publishState.busy
                  ? "Guardando…"
                  : "Guardar y publicar"}
              </button>
            </div>
            <p className="admin-field-hint">
              “Guardar y publicar” guarda este estado y lo manda a los canales Meta
              tildados en un solo paso (WhatsApp sigue manual, con el botón de
              compartir de arriba).
            </p>
          </div>
        </div>

        <aside className="admin-mkt-composer-side">
          <div className="admin-card">
            <h3 className="admin-card-title">Producto</h3>
            {selectedProduct ? (
              <div className="admin-mkt-product-selected">
                <Image src={selectedProduct.photo} alt="" width={64} height={64} unoptimized />
                <div>
                  <strong>{selectedProduct.name}</strong>
                  <span className="admin-cell-sub">
                    {formatARS(selectedProduct.price)} · {selectedProduct.category}
                  </span>
                  <button
                    type="button"
                    className="admin-button small"
                    onClick={() => setState({ ...state, productId: null })}
                  >
                    Quitar vínculo
                  </button>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="search"
                  className="admin-input"
                  placeholder="Buscar producto por nombre o categoría…"
                  value={productFinder}
                  onChange={(e) => setProductFinder(e.target.value)}
                />
                {finderBusy && <p className="admin-field-hint">Buscando…</p>}
                <div className="admin-mkt-product-results">
                  {finderList.length === 0 && !finderBusy && (
                    <p className="admin-field-hint">Sin resultados. El post puede ser de marca sin producto.</p>
                  )}
                  {finderList.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="admin-mkt-product-row"
                      onClick={() => {
                        setState({
                          ...state,
                          productId: p.id,
                          title: state.title || p.name,
                          hashtags: Array.from(
                            new Set([...state.hashtags, p.category.toLowerCase().replace(/\s+/g, "")])
                          ).slice(0, 30),
                        });
                        setProductFinder("");
                      }}
                    >
                      <Image src={p.photo} alt="" width={44} height={44} unoptimized />
                      <span>
                        <strong>{p.name}</strong>
                        <span className="admin-cell-sub">
                          {formatARS(p.price)} · {p.category}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <AiCopyPanel
            channels={state.channels}
            productId={state.productId}
            disabled={saving}
            onApply={applyVariant}
          />
        </aside>
      </div>

      <div className="admin-card admin-mkt-previewcard">
        <div className="admin-mkt-preview-tabs">
          <h3 className="admin-card-title">Vista previa</h3>
          <div className="admin-mkt-preview-tabbtns">
            {state.channels.length === 0 && <span className="admin-cell-sub">Elegí un canal arriba</span>}
            {state.channels.map((c) => (
              <button
                key={c}
                type="button"
                className={`admin-mkt-preview-tab ${channelPreview === c ? "active" : ""}`}
                onClick={() => setPreviewChannel(c)}
              >
                {CHANNELS.find((entry) => entry.value === c)?.label ?? c}
              </button>
            ))}
          </div>
        </div>
        <PostPreview
          channel={channelPreview}
          body={state.body}
          hashtags={state.hashtags}
          coverUrl={state.media[0] ?? ""}
          product={
            selectedProduct
              ? {
                  name: selectedProduct.name,
                  price: formatARS(selectedProduct.price),
                  photo: selectedProduct.photo,
                }
              : null
          }
          instagramHandle={settings.instagramHandle}
          whatsappPhone={settings.whatsappPhone}
          link={selectedProduct ? `${siteUrl}/products/${selectedProduct.slug}` : siteUrl}
        />
      </div>
    </div>
  );
}
