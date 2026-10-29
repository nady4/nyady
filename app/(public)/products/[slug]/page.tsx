import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getProduct, getRelatedProducts } from "@/actions/products";
import { getSiteUrl } from "@/lib/site-url";
import ProductClient from "./page.client";
import { ProductType } from "@/types";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const product = await getProduct(decoded);

  if (!product) {
    return { title: "Producto no encontrado" };
  }

  const siteUrl = getSiteUrl();

  return {
    title: product.name,
    description:
      product.description ??
      "Sandalias artesanales hechas a mano. Envíos a todo Argentina.",
    alternates: {
      canonical: `/products/${product.slug}`,
    },
    openGraph: {
      type: "website",
      url: `${siteUrl}/products/${product.slug}`,
      siteName: "NYADY",
      locale: "es_AR",
      title: product.name,
      description:
        product.description ??
        "Sandalias artesanales hechas a mano. Envíos a todo Argentina.",
      images: [
        {
          url: `/api/og?productId=${encodeURIComponent(product.id)}`,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description:
        product.description ??
        "Sandalias artesanales hechas a mano. Envíos a todo Argentina.",
      images: [`/api/og?productId=${encodeURIComponent(product.id)}`],
    },
  };
}

export default async function ProductPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  const product = await getProduct(decoded);

  if (!product) {
    notFound();
  }

  // Old URLs referenced the cuid (shared history, MP external references,
  // previous sitemaps): answer a 301 so links and ranking move to the slug.
  if (product.slug !== decoded) {
    permanentRedirect(`/products/${product.slug}`);
  }

  const relatedList = await getRelatedProducts(product.id, product.category);

  // Ranking: same-category first, size matches before color matches.
  const byScore = (a: { product: ProductType; sameCategory: boolean }, b: { product: ProductType; sameCategory: boolean }) => {
    if (a.sameCategory !== b.sameCategory) return a.sameCategory ? -1 : 1;
    return 0;
  };
  const relatedProducts = relatedList
    .sort(byScore)
    .slice(0, 4)
    .map((entry) => entry.product);

  const siteUrl = getSiteUrl();
  const allPhotos =
    (product.photos as Record<string, string[]> | null) ?? {};
  const flatPhotos =
    Object.values(allPhotos).flat().length > 0
      ? Object.values(allPhotos).flat()
      : [product.photo];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    sku: product.code ?? product.id,
    brand: { "@type": "Brand", name: "NYADY" },
    image: flatPhotos.map((p) =>
      p.startsWith("http") ? p : `${siteUrl}${p}`
    ),
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${product.slug}`,
      priceCurrency: "ARS",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "NYADY" },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Catálogo",
        item: `${siteUrl}/catalog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `${siteUrl}/products/${product.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductClient product={product} relatedProducts={relatedProducts} />
    </>
  );
}
