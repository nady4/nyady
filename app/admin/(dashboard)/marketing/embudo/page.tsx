import Link from "next/link";
import FunnelCard from "@/components/admin/marketing/FunnelCard";
import { loadFunnelData } from "@/lib/marketing/funnel";
import { loadContentPreferences } from "@/lib/marketing/content-planner";

export const metadata = {
  title: "Marketing · Embudo",
};

/**
 * Marketing funnel (phase 5): the panel that answers "did this sell?".
 * Every social link published by the system carries UTM params and the
 * checkout stores them, so this page is the measurement half of the engine.
 */
export default async function MarketingFunnelPage() {
  const [funnel, preferences] = await Promise.all([
    loadFunnelData().catch((error) => {
      console.error("[admin/funnel] load failed:", error);
      return null;
    }),
    loadContentPreferences().catch(() => null),
  ]);

  return (
    <main className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1 className="admin-title">Embudo de marketing</h1>
        <Link href="/admin/marketing" className="admin-button">
          Volver a Marketing
        </Link>
      </div>

      {!funnel ? (
        <p className="admin-error">
          No se pudo cargar el embudo. Revisá la conexión con la base de datos.
        </p>
      ) : (
        <>
          {preferences && preferences.bestHours.length > 0 && (
            <p className="admin-field-hint">
              Horarios configurados: <strong>{preferences.bestHours.join(" · ")}</strong>{" "}
              (hora Argentina). Si el embudo muestra mejores horarios, actualizá
              las preferencias en el planificador.
            </p>
          )}
          <FunnelCard funnel={funnel} />
        </>
      )}
    </main>
  );
}
