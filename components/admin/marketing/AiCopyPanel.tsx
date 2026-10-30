"use client";

import { useState } from "react";
import {
  generateMarketingCopyAction,
  type GenerateCopyResult,
} from "@/actions/admin/marketing";
import type { CopyVariant } from "@/lib/marketing/ai";

interface AiCopyPanelProps {
  channels: string[];
  productId: string | null;
  disabled: boolean;
  onApply: (variant: CopyVariant) => void;
}

const TONES = [
  { value: 0, label: "Directo y cercano" },
  { value: 1, label: "Aspiracional / editorial" },
  { value: 2, label: "Promo con urgencia" },
];

/**
 * Panel that asks the OpenCode Go-backed server action for 3 copy variants
 * (hook + body + hashtags + CTA) and lets the admin apply or copy each one.
 */
export default function AiCopyPanel({
  channels,
  productId,
  disabled,
  onApply,
}: AiCopyPanelProps) {
  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variants, setVariants] = useState<CopyVariant[] | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generate = async () => {
    setError(null);
    if (channels.length === 0) {
      setError("Elegí al menos un canal antes de generar");
      return;
    }
    setLoading(true);
    try {
      const result: GenerateCopyResult = await generateMarketingCopyAction({
        manualBrief: brief,
        tone,
        channels,
        productId,
      });
      if (result.ok && result.variants) {
        setVariants(result.variants);
      } else {
        setError(result.error ?? "No se pudieron generar variantes");
      }
    } catch {
      setError("Error de conexión. Reintentá.");
    } finally {
      setLoading(false);
    }
  };

  const toPlain = (variant: CopyVariant): string =>
    `${variant.hook}\n\n${variant.body}\n\n${variant.cta}${
      variant.hashtags.length > 0
        ? `\n\n${variant.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
        : ""
    }`;

  const copyVariant = async (index: number, variant: CopyVariant) => {
    try {
      await navigator.clipboard.writeText(toPlain(variant));
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      setError("No se pudo copiar al portapapeles");
    }
  };

  return (
    <div className="admin-card admin-mkt-ai">
      <h3 className="admin-card-title">Generar con IA (OpenCode Go)</h3>

      <label className="admin-field">
        <span>Brief opcional (qué querés contarle a la IA)</span>
        <textarea
          rows={3}
          value={brief}
          maxLength={800}
          placeholder="Ej.: campaña invierno, destacá los tonos tierra, mención lanzamiento viernes…"
          onChange={(e) => setBrief(e.target.value)}
        />
      </label>

      <label className="admin-field">
        <span>Tono</span>
        <select value={tone} onChange={(e) => setTone(Number(e.target.value))}>
          {TONES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="admin-button primary"
        disabled={disabled || loading}
        onClick={() => void generate()}
      >
        {loading ? "Generando…" : "Generar 3 variantes"}
      </button>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {variants && (
        <div className="admin-mkt-ai-variants">
          {variants.map((variant, index) => (
            <div key={index} className="admin-mkt-ai-variant">
              <strong>{variant.hook}</strong>
              <p>{variant.body}</p>
              {variant.cta && <p className="admin-mkt-ai-cta">{variant.cta}</p>}
              {variant.hashtags.length > 0 && (
                <p className="admin-mkt-preview-hashtags">
                  {variant.hashtags
                    .map((h) => (h.startsWith("#") ? h : `#${h}`))
                    .join(" ")}
                </p>
              )}
              <div className="admin-mkt-ai-variant-actions">
                <button
                  type="button"
                  className="admin-button small primary"
                  onClick={() => onApply(variant)}
                >
                  Usar esta
                </button>
                <button
                  type="button"
                  className="admin-button small"
                  onClick={() => void copyVariant(index, variant)}
                >
                  {copiedIndex === index ? "¡Copiada!" : "Copiar texto"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
