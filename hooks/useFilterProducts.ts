"use client";
import { useMemo } from "react";
import { useAppSelector } from "@/hooks/useStore";
import { ProductType } from "@/types";

export const useFilterProducts = (products: ProductType[]) => {
  const searchTerm = useAppSelector((state) => state.searchTerm);
  const { activeCategories } = useAppSelector((state) => state.category);
  const minPrice = useAppSelector((state) => state.price.min);
  const maxPrice = useAppSelector((state) => state.price.max);
  const activeSizes = useAppSelector((state) => state.filters.activeSizes);
  const activeColors = useAppSelector((state) => state.filters.activeColors);

  const hasActiveCategoryFilter = Object.values(activeCategories || {}).some(Boolean);

  const filteredProducts = useMemo(() => {
    const hasSizeFilter = Object.values(activeSizes).some(Boolean);
    const hasColorFilter = Object.values(activeColors).some(Boolean);

    return products.filter((product) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        product.name.toLowerCase().includes(searchLower) ||
        (product.description?.toLowerCase().includes(searchLower) ?? false) ||
        product.category.toLowerCase().includes(searchLower);

      const matchesCategory = !hasActiveCategoryFilter || (activeCategories?.[product.category] ?? true);
      const matchesPrice = product.price >= minPrice && product.price <= maxPrice;

      let matchesSize = true;
      let matchesColor = true;

      if (hasSizeFilter && product.sizes?.length) {
        matchesSize = product.sizes.some((s) => activeSizes[s]);
      }

      if (hasColorFilter && product.colors?.length) {
        matchesColor = product.colors.some((c) => activeColors[c]);
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesPrice &&
        matchesSize &&
        matchesColor
      );
    });
  }, [
    products,
    searchTerm,
    activeCategories,
    hasActiveCategoryFilter,
    minPrice,
    maxPrice,
    activeSizes,
    activeColors,
  ]);

  return filteredProducts;
};