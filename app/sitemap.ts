import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { getAppUrl } from "@/lib/email";

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1.0, changeFrequency: "daily" },
  { path: "/catalog", priority: 0.9, changeFrequency: "daily" },
  { path: "/info/elaboracion", priority: 0.6, changeFrequency: "monthly" },
  { path: "/info/envios", priority: 0.6, changeFrequency: "monthly" },
  { path: "/info/terminos", priority: 0.4, changeFrequency: "yearly" },
  { path: "/info/privacidad", priority: 0.4, changeFrequency: "yearly" },
  { path: "/info/arrepentimiento", priority: 0.4, changeFrequency: "yearly" },
  { path: "/info/reembolsos", priority: 0.4, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl().replace(/\/$/, "");

  const products = await prisma.product.findMany({
    where: { available: true, archivedAt: null },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });

  return [
    ...STATIC_ROUTES.map((r) => ({
      url: `${base}${r.path}`,
      lastModified: new Date(),
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...products.map((p) => ({
      url: `${base}/products/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
