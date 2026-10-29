"use client";
import { useMemo } from "react";
import { useAppSelector } from "@/hooks/useStore";
import { ProductType } from "@/types";

const ACCENT_RE = /[\u0300-\u036f]/g;

/** Accent-insensitive, lowercase contains for the text search. */
function haystack(product: ProductType): string {
  return [
    product.name,
    product.description,
    product.code,
    product.category,
    ...(product.colors ?? []),
    ...(product.sizes ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(ACCENT_RE, "");
}

export const useFilterProducts = (products: ProductType[]) => {
  const { activeCategories } = useAppSelector((state) => state.category);
  const price = useAppSelector((state) => state.price);
  const activeSizes = useAppSelector((state) => state.filters.activeSizes);
  const activeColors = useAppSelector((state) => state.filters.activeColors);
  const query = useAppSelector((state) => state.search.query);

  const hasActiveCategoryFilter = Object.values(activeCategories || {}).some(Boolean);

  const filteredProducts = useMemo(() => {
    const hasSizeFilter = Object.values(activeSizes).some(Boolean);
    const hasColorFilter = Object.values(activeColors).some(Boolean);
    // The price filter only applies once the user actually moved a slider:
    // an untouched filter must not hide anything (previously a hardcoded
    // 20k-30k band silently deleted every product priced outside it).
    const hasPriceFilter = price.min !== null && price.max !== null;
    const minPrice = hasPriceFilter ? (price.min as number) : -Infinity;
    const maxPrice = hasPriceFilter ? (price.max as number) : Infinity;

    const q = query.trim().toLowerCase().normalize("NFD").replace(ACCENT_RE, "");
    const hasQuery = q.length > 0;

    return products.filter((product) => {
      const matchesCategory = !hasActiveCategoryFilter || (activeCategories?.[product.category] ?? true);
      const matchesPrice =
        !hasPriceFilter ||
        (product.price >= minPrice && product.price <= maxPrice);
      const matchesQuery = !hasQuery || haystack(product).includes(q);

      let matchesSize = true;
      let matchesColor = true;

      if (hasSizeFilter && product.sizes?.length) {
        matchesSize = product.sizes.some((s) => activeSizes[s]);
      }

      if (hasColorFilter && product.colors?.length) {
        matchesColor = product.colors.some((c) => activeColors[c]);
      }

      return (
        matchesCategory &&
        matchesPrice &&
        matchesQuery &&
        matchesSize &&
        matchesColor
      );
    });
  }, [
    products,
    activeCategories,
    hasActiveCategoryFilter,
    price,
    activeSizes,
    activeColors,
    query,
  ]);

  return filteredProducts;
};
