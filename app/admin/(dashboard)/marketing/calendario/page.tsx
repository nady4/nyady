import Link from "next/link";
import prisma from "@/lib/prisma";
import ContentPlanner from "@/components/admin/marketing/ContentPlanner";
import {
  artDateString,
  artWeekDays,
  loadContentPlan,
  loadContentPreferences,
} from "@/lib/marketing/content-planner";

export const metadata = {
  title: "Marketing · Planificador",
};

/**
 * Content planner (phase 5): preferences + editorial calendar + generation.
 *
 * This is where "qué posteo" becomes a repeatable process: the AI proposes
 * the week, the admin adjusts it, and the planned slots turn into post
 * drafts with copy, media and schedule — ready for the publish queue.
 */
export default async function MarketingPlannerPage() {
  // The week starts on Monday (Argentina time).
  const today = artDateString(new Date());
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const start = new Date(`${today}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - mondayOffset);
  const startDate = artDateString(start);

  const days = artWeekDays(startDate);

  const [preferences, plan, products] = await Promise.all([
    loadContentPreferences().catch(() => null),
    loadContentPlan(days).catch((error) => {
      console.error("[admin/planner] plan load failed:", error);
      return [];
    }),
    prisma.product
      .findMany({
        where: { archivedAt: null },
        orderBy: { name: "asc" },
        take: 200,
        select: { id: true, name: true },
      })
      .catch(() => []),
  ]);

  return (
    <main className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1 className="admin-title">Planificador de contenido</h1>
        <Link href="/admin/marketing" className="admin-button">
          Volver a Marketing
        </Link>
      </div>

      <p className="admin-field-hint">
        Preferencias → calendario → borradores → cola de publicación. La IA
        propone, vos aprobás, y la cola publica lo aprobado en su horario.
      </p>

      {preferences ? (
        <ContentPlanner
          preferences={preferences}
          plan={plan}
          days={days}
          products={products}
        />
      ) : (
        <p className="admin-error">No se pudieron cargar las preferencias.</p>
      )}
    </main>
  );
}
