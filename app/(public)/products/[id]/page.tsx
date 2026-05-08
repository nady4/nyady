import type { Metadata } from "next";
import { getProduct, getProducts } from "@/actions/products";
import Product from "./page.client";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const product = await getProduct(decodedId);

  if (!product) {
    return {
      title: "Producto no encontrado - NYADY",
    };
  }

  return {
    title: `${product.name} - NYADY`,
    description: product.description,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  const product = await getProduct(decodedId);

  if (!product) {
    notFound();
  }

  const allProducts = await getProducts();
  const currentProduct = product;
  
  const productSizes = new Set(currentProduct.sizes || []);
  const productColors = new Set(currentProduct.colors || []);
  
  const sameCategory = allProducts.filter(
    (p) => p.category === currentProduct.category && p.id !== decodedId
  );
  
  const matchesBoth = sameCategory.filter((p) => {
    const hasMatchingSize = p.sizes?.some((s) => productSizes.has(s));
    const hasMatchingColor = p.colors?.some((c) => productColors.has(c));
    return hasMatchingSize && hasMatchingColor;
  });
  
  const matchesSizeOnly = sameCategory.filter((p) => {
    if (matchesBoth.includes(p)) return false;
    const hasMatchingSize = p.sizes?.some((s) => productSizes.has(s));
    return hasMatchingSize;
  });
  
  const matchesColorOnly = sameCategory.filter((p) => {
    if (matchesBoth.includes(p) || matchesSizeOnly.includes(p)) return false;
    const hasMatchingColor = p.colors?.some((c) => productColors.has(c));
    return hasMatchingColor;
  });
  
  const sameCategoryOnly = sameCategory.filter((p) => {
    if (matchesBoth.includes(p) || matchesSizeOnly.includes(p) || matchesColorOnly.includes(p)) return false;
    return true;
  });
  
  let relatedProducts = [
    ...matchesBoth,
    ...matchesSizeOnly,
    ...matchesColorOnly,
    ...sameCategoryOnly
  ].slice(0, 4);
  
  if (relatedProducts.length < 3) {
    const otherProducts = allProducts
      .filter((p) => !relatedProducts.includes(p) && p.id !== decodedId)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3 - relatedProducts.length);
    relatedProducts = [...relatedProducts, ...otherProducts];
  }
  
  relatedProducts = relatedProducts.slice(0, 4);

  return <Product product={product} relatedProducts={relatedProducts} />;
}