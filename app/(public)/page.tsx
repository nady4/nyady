import prisma from "@/lib/prisma";
import LandingClient from "./landing.client";
import type { PromoBannerView } from "./landing.client";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [settings, banners] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { id: "default" } }),
    prisma.banner.findMany({
      where: {
        placement: "home_promo",
        active: true,
        OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 4,
    }),
  ]);

  const promoBanners: PromoBannerView[] = banners.map((banner) => ({
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    imageUrl: banner.imageUrl,
    href: banner.href,
  }));

  return (
    <LandingClient
      copy={{
        heroTitle: settings?.heroTitle ?? null,
        heroSubtitle: settings?.heroSubtitle ?? null,
        heroCtaLabel: settings?.heroCtaLabel ?? null,
        heroCtaHref: settings?.heroCtaHref ?? null,
      }}
      promoBanners={promoBanners}
    />
  );
}
