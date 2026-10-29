import prisma from "@/lib/prisma";
import SettingsForm from "@/components/admin/settings/SettingsForm";
import StorefrontRefresh from "@/components/admin/settings/StorefrontRefresh";
import { hasZipnovaCredentials } from "@/actions/shipping";
import WholesaleTiersEditor from "@/components/admin/settings/WholesaleTiersEditor";
import { getStoreWholesaleTiers } from "@/lib/store-settings";
import { fraunces } from "@/app/fonts";

export const metadata = {
  title: "Configuración",
};

function envStatus(...keys: string[]): boolean {
  return keys.every((key) => {
    const value = process.env[key];
    return Boolean(value && value.trim() && !value.startsWith("your"));
  });
}

// Blob v2 authentica con OIDC (VERCEL_OIDC_TOKEN + BLOB_STORE_ID; el token
// de deployment lo inyecta Vercel y el local viene de `vercel env pull`) —
// el read-write token queda como fallback clásico.
function blobConfigured(): boolean {
  return (
    envStatus("BLOB_READ_WRITE_TOKEN") ||
    Boolean(
      process.env.BLOB_STORE_ID &&
        (process.env.VERCEL === "1" || envStatus("VERCEL_OIDC_TOKEN"))
    )
  );
}

export default async function AdminSettingsPage() {
  const [settings, zipnovaOk] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { id: "default" } }),
    hasZipnovaCredentials(),
  ]);

  const integrations: {
    name: string;
    ok: boolean;
    hint: string;
  }[] = [
    {
      name: "Base de datos",
      ok: envStatus("DATABASE_URL"),
      hint: "DATABASE_URL",
    },
    {
      name: "Mercado Pago",
      ok: envStatus("MP_ACCESS_TOKEN", "NEXT_PUBLIC_MP_PUBLIC_KEY"),
      hint: "MP_ACCESS_TOKEN, NEXT_PUBLIC_MP_PUBLIC_KEY",
    },
    {
      name: "Zipnova (envíos)",
      ok: zipnovaOk,
      hint: "ZIPNOVA_KEY, ZIPNOVA_SECRET, ZIPNOVA_ACCOUNT_ID",
    },
    {
      name: "Resend (emails)",
      ok: envStatus("RESEND_API_KEY"),
      hint: "RESEND_API_KEY, EMAIL_FROM",
    },
    {
      name: "Vercel Blob (imágenes)",
      ok: blobConfigured(),
      hint: "BLOB_READ_WRITE_TOKEN o BLOB_STORE_ID (OIDC)",
    },
    {
      name: "URL pública (auth)",
      ok: envStatus("NEXTAUTH_URL", "NEXTAUTH_SECRET"),
      hint: "NEXTAUTH_URL, NEXTAUTH_SECRET",
    },
  ];

  const adminUsername = process.env.ADMIN_USERNAME || "nyady";

  return (
    <main className="admin-page admin-page-wide admin-settings-page">
      <h1 className="admin-title">Configuración</h1>

      <div className="admin-settings-grid">
        <div className="admin-settings-col">
          <div className="admin-card">
            <h2 className={`admin-card-title ${fraunces.className}`}>
              Datos de la tienda y portada
            </h2>
            <SettingsForm
              settings={
                settings
                  ? {
                      storeName: settings.storeName,
                      contactEmail: settings.contactEmail,
                      whatsapp: settings.whatsapp,
                      instagram: settings.instagram,
                      facebook: settings.facebook,
                      announcement: settings.announcement,
                      heroTitle: settings.heroTitle,
                      heroSubtitle: settings.heroSubtitle,
                      heroCtaLabel: settings.heroCtaLabel,
                      heroCtaHref: settings.heroCtaHref,
                    }
                  : null
              }
            />
          </div>

          <div className="admin-card">
            <h2 className="admin-card-title">Descuentos mayoristas</h2>
            <WholesaleTiersEditor tiers={await getStoreWholesaleTiers()} />
          </div>
        </div>

        <div className="admin-settings-col">
          <div className="admin-card">
            <h2 className="admin-card-title">Integraciones</h2>
            <div className="admin-integration-list">
              {integrations.map((integration) => (
                <div key={integration.name} className="admin-integration-row">
                  <span className="admin-integration-name">
                    {integration.name}
                    <span className="admin-cell-sub">{integration.hint}</span>
                  </span>
                  <span
                    className={`admin-status-badge ${
                      integration.ok ? "available" : "status-pending"
                    }`}
                  >
                    {integration.ok ? "Configurada" : "Falta config"}
                  </span>
                </div>
              ))}
            </div>
            <p className="admin-field-hint">
              No se muestran valores: solo si cada variable está definida.
            </p>
          </div>

          <div className="admin-card">
            <h2 className="admin-card-title">Administración</h2>
            <div className="admin-order-detail-lines">
              <span>
                Usuario admin: <strong>{adminUsername}</strong>
                {envStatus("ADMIN_PASSWORD")
                  ? " · contraseña configurada por env"
                  : " · contraseña por default (nyady): configurala"}
              </span>
              <span>
                La sesión admin usa una cookie firmada de 7 días
                (NEXTAUTH_SECRET / ADMIN_SECRET).
              </span>
            </div>
            <StorefrontRefresh />
          </div>
        </div>
      </div>
    </main>
  );
}
