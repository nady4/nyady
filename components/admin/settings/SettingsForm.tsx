"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveStoreSettingsAction } from "@/actions/admin/content";
import type { AdminActionResult } from "@/types/admin";

interface StoreSettingsFormProps {
  settings?: {
    storeName: string;
    contactEmail: string | null;
    whatsapp: string | null;
    instagram: string | null;
    facebook: string | null;
    announcement: string | null;
    heroTitle: string | null;
    heroSubtitle: string | null;
    heroCtaLabel: string | null;
    heroCtaHref: string | null;
  } | null;
}

/**
 * Store profile + landing hero copy (persisted on the StoreSettings
 * singleton). The hero fields fall back to the hardcoded landing copy when
 * left empty.
 */
export default function SettingsForm({ settings }: StoreSettingsFormProps) {
  const router = useRouter();
  const [storeName, setStoreName] = useState(settings?.storeName ?? "NYADY");
  const [contactEmail, setContactEmail] = useState(settings?.contactEmail ?? "");
  const [whatsapp, setWhatsapp] = useState(settings?.whatsapp ?? "");
  const [instagram, setInstagram] = useState(settings?.instagram ?? "");
  const [facebook, setFacebook] = useState(settings?.facebook ?? "");
  const [announcement, setAnnouncement] = useState(settings?.announcement ?? "");
  const [heroTitle, setHeroTitle] = useState(settings?.heroTitle ?? "");
  const [heroSubtitle, setHeroSubtitle] = useState(settings?.heroSubtitle ?? "");
  const [heroCtaLabel, setHeroCtaLabel] = useState(settings?.heroCtaLabel ?? "");
  const [heroCtaHref, setHeroCtaHref] = useState(settings?.heroCtaHref ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);

    const input = {
      storeName,
      contactEmail: contactEmail.trim() || null,
      whatsapp: whatsapp.trim() || null,
      instagram: instagram.trim() || null,
      facebook: facebook.trim() || null,
      announcement: announcement.trim() || null,
      heroTitle: heroTitle.trim() || null,
      heroSubtitle: heroSubtitle.trim() || null,
      heroCtaLabel: heroCtaLabel.trim() || null,
      heroCtaHref: heroCtaHref.trim() || null,
    };

    try {
      const result: AdminActionResult = await saveStoreSettingsAction(input);
      if (!result.ok) {
        setError(result.error ?? "No se pudo guardar");
        setBusy(false);
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Error de conexión. Reintentá.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-product-form" onSubmit={handleSubmit}>
      <div className="admin-form-section">
        <h2 className="admin-form-section-title">Datos de la tienda</h2>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Nombre de la tienda</span>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              maxLength={60}
              required
            />
          </label>
          <label className="admin-field">
            <span>Email de contacto</span>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="hola@nyady.com"
            />
          </label>
          <label className="admin-field">
            <span>WhatsApp de contacto</span>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+5491122334455"
            />
          </label>
          <label className="admin-field">
            <span>Instagram (@o-url)</span>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@nyady.store"
            />
          </label>
          <label className="admin-field">
            <span>Facebook (@o-url)</span>
            <input
              type="text"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="@nyady.arg"
            />
          </label>
          <label className="admin-field admin-field-wide">
            <span>Anuncio para la tienda (en construcción)</span>
            <input
              type="text"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="3 y 6 cuotas sin interés"
            />
          </label>
        </div>
      </div>

      <div className="admin-form-section">
        <h2 className="admin-form-section-title">Portada (hero)</h2>
        <div className="admin-form-grid">
          <label className="admin-field admin-field-wide">
            <span>Título</span>
            <input
              type="text"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder="Sentite cómoda. Sentite vos."
            />
          </label>
          <label className="admin-field admin-field-wide">
            <span>Subtítulo</span>
            <textarea
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              rows={2}
              placeholder="Encontrá ese par que completa tus días."
            />
          </label>
          <label className="admin-field">
            <span>Texto del botón</span>
            <input
              type="text"
              value={heroCtaLabel}
              onChange={(e) => setHeroCtaLabel(e.target.value)}
              placeholder="Abrir Catálogo"
            />
          </label>
          <label className="admin-field">
            <span>Destino del botón</span>
            <input
              type="text"
              value={heroCtaHref}
              onChange={(e) => setHeroCtaHref(e.target.value)}
              placeholder="/catalog"
            />
          </label>
        </div>
        <p className="admin-field-hint">
          Si dejás un campo vacío, la portada usa el texto actual de la tienda.
        </p>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-form-actions">
        {saved && <span className="admin-saved-hint">Guardado</span>}
        <button type="submit" className="admin-button primary" disabled={busy}>
          {busy ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </form>
  );
}
