"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TagInput from "@/components/admin/ui/TagInput";
import { saveMarketingSettingsAction } from "@/actions/admin/marketing";
import type { AdminActionResult, MarketingSettingsState } from "@/types/admin";

const VOICE_HINT =
  "Con gusto la IA escribe los copys. Describe la marca para que cada generación respete tu estilo (tono, qué no hacer, foco del negocio).";

interface InputState {
  brandVoice: string;
  defaultHashtags: string[];
  instagramHandle: string;
  whatsappPhone: string;
}

export default function MarketingSettingsCard({
  settings,
}: {
  settings: MarketingSettingsState;
}) {
  const router = useRouter();
  const [input, setInput] = useState<InputState>({
    brandVoice: settings.brandVoice ?? "",
    defaultHashtags: settings.defaultHashtags,
    instagramHandle: settings.instagramHandle ?? "",
    whatsappPhone: settings.whatsappPhone ?? "",
  });
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const result: AdminActionResult = await saveMarketingSettingsAction({
        brandVoice: input.brandVoice.trim() || null,
        defaultHashtags: input.defaultHashtags,
        instagramHandle: input.instagramHandle.trim() || null,
        whatsappPhone: input.whatsappPhone.trim() || null,
      });
      if (result.ok) {
        setMessage({ kind: "ok", text: "Configuración guardada" });
        router.refresh();
        setTimeout(() => setMessage(null), 2500);
      } else {
        setMessage({ kind: "error", text: result.error ?? "No se pudo guardar" });
      }
    } catch {
      setMessage({ kind: "error", text: "Error de conexión. Reintentá." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-card admin-mkt-settings">
      <h3 className="admin-card-title">Marca & preferencias</h3>
      {message && (
        <p
          className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}
          role={message.kind === "ok" ? "status" : "alert"}
        >
          {message.text}
        </p>
      )}

      <p className="admin-field-hint">{VOICE_HINT}</p>

      <div className="admin-form-grid">
        <label className="admin-field admin-field-wide">
          <span>Voz de marca (se pasa a la IA)</span>
          <textarea
            rows={4}
            value={input.brandVoice}
            maxLength={1500}
            placeholder="NYADY: sandalias artesanales de taco made in Córdoba. Tono cálido y femenino..."
            onChange={(e) => setInput({ ...input, brandVoice: e.target.value })}
          />
        </label>
        <TagInput
          label="Hashtags default (se sugieren en cada copy)"
          values={input.defaultHashtags}
          onChange={(values) => setInput({ ...input, defaultHashtags: values })}
          placeholder="nyady y Enter"
        />
        <label className="admin-field">
          <span>Usuario de Instagram (para etiquetar)</span>
          <input
            type="text"
            value={input.instagramHandle}
            maxLength={40}
            placeholder="nyady.ok"
            onChange={(e) => setInput({ ...input, instagramHandle: e.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Número de WhatsApp Business</span>
          <input
            type="text"
            value={input.whatsappPhone}
            maxLength={16}
            placeholder="5493510000000 (código país + número, sin 0 ni 15)"
            onChange={(e) => setInput({ ...input, whatsappPhone: e.target.value })}
          />
        </label>
      </div>

      <div className="admin-form-actions">
        <button
          type="button"
          className="admin-button primary"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? "Guardando..." : "Guardar preferencias"}
        </button>
      </div>
    </div>
  );
}
