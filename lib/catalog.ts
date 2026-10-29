import { isBlackColor } from "@/lib/colors";

// Catalog order alternates between a product with a non-black color and one
// that only comes in black — colorful products make a better first
// impression, but a wall of them hides the black ones. DB order is preserved
// within each group.
export const hasColorOtherThanBlack = (product: { colors?: string[] }) =>
  (product.colors ?? []).some((color) => !isBlackColor(color));

export const interleaveByColor = <T extends { colors?: string[] }>(products: T[]) => {
  const colorful = products.filter(hasColorOtherThanBlack);
  const blackOnly = products.filter((p) => !hasColorOtherThanBlack(p));
  const interleaved: T[] = [];
  for (let i = 0; i < Math.max(colorful.length, blackOnly.length); i++) {
    if (i < colorful.length) interleaved.push(colorful[i]);
    if (i < blackOnly.length) interleaved.push(blackOnly[i]);
  }
  return interleaved;
};

export interface PriceBounds {
  min: number;
  max: number;
}

/** Real min/max price of a product list, powering the price filter bounds. */
export function getPriceBounds(products: { price: number }[]): PriceBounds {
  if (products.length === 0) return { min: 0, max: 50000 };
  let min = Infinity;
  let max = 0;
  for (const product of products) {
    if (product.price < min) min = product.price;
    if (product.price > max) max = product.price;
  }
  return { min: Math.floor(min), max: Math.ceil(max) };
}
