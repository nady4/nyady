import prisma from "@/lib/prisma";
import { num } from "@/lib/money";
import LandingClient from "./landing.client";
import type { PromoBannerView } from "./landing.client";

// The landing is static-ish: admin edits (content/settings) call
// revalidatePath("/"), so a short TTL only affects banner scheduling drift.
export const revalidate = 120;

export default async function LandingPage() {
  const [settings, banners, carouselProducts] = await Promise.all([
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
    // Small, cheap slice for the hero carousel: server-rendered so the home
    // HTML carries real product links and the LCP photo.
    prisma.product.findMany({
      where: { available: true, archivedAt: null },
      select: {
        id: true,
        slug: true,
        name: true,
        photo: true,
        price: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
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
      carouselProducts={carouselProducts.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        photo: p.photo,
        price: num(p.price),
      }))}
    />
  );
}
