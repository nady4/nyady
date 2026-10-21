import prisma from "@/lib/prisma";
import BannersAdmin from "@/components/admin/content/BannersAdmin";
import InfoPagesAdmin from "@/components/admin/content/InfoPagesAdmin";
import { INFO_FALLBACKS } from "@/components/info/InfoFallbacks";
import type { AdminBannerRow } from "@/components/admin/content/BannersAdmin";
import type { AdminInfoPageRow } from "@/components/admin/content/InfoPagesAdmin";

export const metadata = {
  title: "Contenido",
};

export default async function AdminContentPage() {
  const [banners, infoRows] = await Promise.all([
    prisma.banner.findMany({
      where: { placement: "home_promo" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.infoPage.findMany(),
  ]);

  const bannerRows: AdminBannerRow[] = banners.map((banner) => ({
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    imageUrl: banner.imageUrl,
    href: banner.href,
    placement: banner.placement,
    active: banner.active,
    sortOrder: banner.sortOrder,
    startsAt: banner.startsAt,
    endsAt: banner.endsAt,
  }));

  const dbBySlug = new Map(infoRows.map((row) => [row.slug, row]));
  const infoPages: AdminInfoPageRow[] = Object.entries(INFO_FALLBACKS).map(
    ([slug, fallback]) => {
      const row = dbBySlug.get(slug);
      return {
        slug,
        title: row?.title ?? fallback.title,
        edited: Boolean(row),
        updatedAt: row?.updatedAt ?? null,
        dbContent: row?.content ?? null,
        dbDescription: row?.description ?? null,
        fallbackTitle: fallback.title,
        fallbackContent: fallback.content,
        fallbackDescription: fallback.description,
      };
    }
  );

  return (
    <main className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1 className="admin-title">Contenido</h1>
      </div>

      <section className="admin-content-section">
        <h2 className="admin-content-section-title">Banners de portada</h2>
        <BannersAdmin banners={bannerRows} />
      </section>

      <section className="admin-content-section">
        <h2 className="admin-content-section-title">Páginas informativas</h2>
        <InfoPagesAdmin pages={infoPages} />
      </section>
    </main>
  );
}
