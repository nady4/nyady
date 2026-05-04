"use client";
import { useMemo } from "react";
import { useAppSelector } from "@/hooks/useStore";
import { ProductType } from "@/types";

export const useFilterProducts = (products: ProductType[]) => {
  const searchTerm = useAppSelector((state) => state.searchTerm);
  const { activeCategories } = useAppSelector((state) => state.category);
  const minPrice = useAppSelector((state) => state.price.min);
  const maxPrice = useAppSelector((state) => state.price.max);

  const filteredProducts = useMemo(() => {
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        activeCategories[product.category] &&
        product.price >= minPrice &&
        product.price <= maxPrice
    );
  }, [products, searchTerm, activeCategories, minPrice, maxPrice]);

  return filteredProducts;
};