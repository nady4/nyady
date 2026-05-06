"use client";
import { useMemo } from "react";
import { useAppSelector } from "@/hooks/useStore";

export const useGetFilters = () => {
  const products = useAppSelector((state) => state.products);

  const allColors = useMemo(() => {
    const colorSet = new Set<string>();
    products.forEach((p) => {
      if (p.colors) {
        p.colors.forEach((c) => colorSet.add(c));
      }
    });
    return Array.from(colorSet).sort();
  }, [products]);

  const allSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    products.forEach((p) => {
      if (p.sizes) {
        p.sizes.forEach((s) => sizeSet.add(s));
      }
    });
    return Array.from(sizeSet).sort((a, b) => {
      const order = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "One Size"];
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [products]);

  return { allColors, allSizes };
};