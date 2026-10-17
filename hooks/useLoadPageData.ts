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

type PageType = "catalog" | "cart" | "wishlist";

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
          dispatch(setProducts(products));

          const categories = [...new Set(products.map((p) => p.category))];
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