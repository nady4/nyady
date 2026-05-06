"use client";
import { useSession } from "next-auth/react";
import { useLoadPageData } from "@/hooks/useLoadPageData";
import SearchBar from "@/components/SearchBar";
import ProductList from "@/components/ProductList";
import { useEffect, useState } from "react";
import { initializeCart } from "@/store/slices/cartSlice";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { ProductType } from "@/types";
import { getCartProducts } from "@/actions/cart";

let cartPageCache: ProductType[] | null = null;
let cartPagePromise: Promise<ProductType[]> | null = null;

export default function CatalogPage() {
  const { loading } = useLoadPageData("catalog");
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const dispatch = useAppDispatch();
  const cartProducts = useAppSelector((state) => state.cart);

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;

    const loadCart = async () => {
      let products: ProductType[];
      if (cartPageCache) {
        products = cartPageCache;
      } else if (cartPagePromise) {
        products = await cartPagePromise;
      } else {
        cartPagePromise = getCartProducts(userId);
        products = await cartPagePromise;
        cartPageCache = products;
        cartPagePromise = null;
      }
      dispatch(initializeCart(products.map((p) => p.id)));
    };

    loadCart();
  }, [userId, status, dispatch]);

  return (
    <div className="home-container">
      <SearchBar />
      <ProductList isLoadingExternal={loading} />
    </div>
  );
}