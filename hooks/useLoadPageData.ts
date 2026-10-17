"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAppDispatch } from "@/hooks/useStore";
import { setProducts } from "@/store/slices/productsSlice";
import { initializeCart } from "@/store/slices/cartSlice";
import { initializeWishList } from "@/store/slices/wishListSlice";
import { getProducts } from "@/actions/products";
import { getCartProducts } from "@/actions/cart";
import { getWishListProducts, getWishlistIds } from "@/actions/wishlist";
import { setCategories } from "@/store/slices/categorySlice";
import { isBlackColor } from "@/lib/colors";

type PageType = "catalog" | "cart" | "wishlist";

// Catalog order alternates between a product with a non-black color and one
// that only comes in black — colorful products make a better first
// impression, but a wall of them hides the black ones. DB order is preserved
// within each group.
const hasColorOtherThanBlack = (product: { colors?: string[] }) =>
  (product.colors ?? []).some((color) => !isBlackColor(color));

const interleaveByColor = <T extends { colors?: string[] }>(products: T[]) => {
  const colorful = products.filter(hasColorOtherThanBlack);
  const blackOnly = products.filter((p) => !hasColorOtherThanBlack(p));
  const interleaved: T[] = [];
  for (let i = 0; i < Math.max(colorful.length, blackOnly.length); i++) {
    if (i < colorful.length) interleaved.push(colorful[i]);
    if (i < blackOnly.length) interleaved.push(blackOnly[i]);
  }
  return interleaved;
};

export const useLoadPageData = (pageType: PageType) => {
  const { data: session, status } = useSession();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const userId = session?.user?.id;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        if (pageType === "catalog") {
          const products = await getProducts();
          const sortedProducts = interleaveByColor(products);
          dispatch(setProducts(sortedProducts));

          const categories = [
            ...new Set(sortedProducts.map((p) => p.category)),
          ];
          dispatch(setCategories(categories));

          if (status === "authenticated" && userId) {
            const ids = await getWishlistIds(userId);
            dispatch(initializeWishList(ids));
          }
        } else if (pageType === "cart") {
          if (status !== "authenticated" || !userId) {
            dispatch(initializeCart([]));
            setLoading(false);
            return;
          }

          const products = await getCartProducts(userId);
          dispatch(initializeCart(products.map((p) => p.id)));
        } else if (pageType === "wishlist") {
          if (status !== "authenticated" || !userId) {
            dispatch(setProducts([]));
            setLoading(false);
            return;
          }

          const ids = await getWishlistIds(userId);
          dispatch(initializeWishList(ids));

          const products = await getWishListProducts(userId);
          dispatch(setProducts(products));
        }
      } catch (error) {
        console.error(`Error loading ${pageType} data:`, error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [pageType, userId, status, dispatch]);

  return { loading };
};