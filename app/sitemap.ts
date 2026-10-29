import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1.0, changeFrequency: "daily" },
  { path: "/catalog", priority: 0.9, changeFrequency: "daily" },
  { path: "/info/elaboracion", priority: 0.6, changeFrequency: "monthly" },
  { path: "/info/envios", priority: 0.6, changeFrequency: "monthly" },
  { path: "/info/medios-de-pago", priority: 0.5, changeFrequency: "monthly" },
  { path: "/info/promociones", priority: 0.5, changeFrequency: "monthly" },
  { path: "/info/preguntas-frecuentes", priority: 0.5, changeFrequency: "monthly" },
  { path: "/info/contacto", priority: 0.5, changeFrequency: "monthly" },
  { path: "/info/nady4", priority: 0.4, changeFrequency: "monthly" },
  { path: "/info/blog", priority: 0.3, changeFrequency: "weekly" },
  { path: "/info/terminos", priority: 0.4, changeFrequency: "yearly" },
  { path: "/info/privacidad", priority: 0.4, changeFrequency: "yearly" },
  { path: "/info/arrepentimiento", priority: 0.4, changeFrequency: "yearly" },
  { path: "/info/reembolsos", priority: 0.4, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl().replace(/\/$/, "");

  // Strategies: static routes carry no real lastModified signal, so we omit
  // the field instead of claiming "modified today" every single day.
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${base}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const products = await prisma.product.findMany({
    where: { available: true, archivedAt: null },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });

  return [
    ...staticEntries,
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
