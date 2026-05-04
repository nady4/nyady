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
import { ProductType } from "@/types";
import { setCategories } from "@/store/slices/categorySlice";

type PageType = "catalog" | "cart" | "wishlist";

let productsCache: ProductType[] | null = null;
let cartProductsCache: ProductType[] | null = null;
let wishlistProductsCache: ProductType[] | null = null;
let wishlistIdsCache: string[] | null = null;

let productsFetchPromise: Promise<ProductType[]> | null = null;
let cartProductsFetchPromise: Promise<ProductType[]> | null = null;
let wishlistProductsFetchPromise: Promise<ProductType[]> | null = null;
let wishlistIdsFetchPromise: Promise<string[]> | null = null;

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
          let products: ProductType[];

          if (productsCache) {
            products = productsCache;
          } else if (productsFetchPromise) {
            products = await productsFetchPromise;
          } else {
            productsFetchPromise = getProducts();
            products = await productsFetchPromise;
            productsCache = products;
            productsFetchPromise = null;
          }

          dispatch(setProducts(products));

          const categories = [...new Set(products.map((p) => p.category))];
          dispatch(setCategories(categories));

          if (status === "authenticated" && userId) {
            if (wishlistIdsCache) {
              dispatch(initializeWishList(wishlistIdsCache));
            } else if (wishlistIdsFetchPromise) {
              const ids = await wishlistIdsFetchPromise;
              dispatch(initializeWishList(ids));
            } else {
              wishlistIdsFetchPromise = getWishlistIds(userId);
              const ids = await wishlistIdsFetchPromise;
              wishlistIdsCache = ids;
              dispatch(initializeWishList(ids));
              wishlistIdsFetchPromise = null;
            }
          }
        } else if (pageType === "cart") {
          if (status !== "authenticated" || !userId) {
            dispatch(initializeCart([]));
            setLoading(false);
            return;
          }

          if (cartProductsCache) {
            dispatch(
              initializeCart(cartProductsCache.map((p: ProductType) => p.id))
            );
          } else if (cartProductsFetchPromise) {
            const products = await cartProductsFetchPromise;
            dispatch(initializeCart(products.map((p) => p.id)));
          } else {
            cartProductsFetchPromise = getCartProducts(userId);
            const products = await cartProductsFetchPromise;
            cartProductsCache = products;
            dispatch(initializeCart(products.map((p) => p.id)));

            cartProductsFetchPromise = null;
          }
        } else if (pageType === "wishlist") {
          if (status !== "authenticated" || !userId) {
            dispatch(setProducts([]));
            setLoading(false);
            return;
          }

          if (wishlistIdsCache) {
            dispatch(initializeWishList(wishlistIdsCache));
          } else if (wishlistIdsFetchPromise) {
            const ids = await wishlistIdsFetchPromise;
            dispatch(initializeWishList(ids));
          } else {
            wishlistIdsFetchPromise = getWishlistIds(userId);
            const ids = await wishlistIdsFetchPromise;
            wishlistIdsCache = ids;
            dispatch(initializeWishList(ids));
            wishlistIdsFetchPromise = null;
          }

          if (wishlistProductsCache) {
            dispatch(setProducts(wishlistProductsCache));
          } else if (wishlistProductsFetchPromise) {
            const products = await wishlistProductsFetchPromise;
            dispatch(setProducts(products));
          } else {
            wishlistProductsFetchPromise = getWishListProducts(userId);
            const products = await wishlistProductsFetchPromise;
            wishlistProductsCache = products;
            dispatch(setProducts(products));
            wishlistProductsFetchPromise = null;
          }
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