"use client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useAppDispatch } from "@/hooks/useStore";
import { useLoadPageData } from "@/hooks/useLoadPageData";
import { getCartProducts } from "@/actions/cart";
import { initializeCart } from "@/store/slices/cartSlice";
import ProductList from "@/components/ProductList";
import Filters from "@/components/Filters";
import { ProductType } from "@/types";

let wishlistPageCache: ProductType[] | null = null;
let wishlistPagePromise: Promise<ProductType[]> | null = null;

export default function WishlistPage() {
  const { loading } = useLoadPageData("wishlist");
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;

    const loadCart = async () => {
      let products: ProductType[];
      if (wishlistPageCache) {
        products = wishlistPageCache;
      } else if (wishlistPagePromise) {
        products = await wishlistPagePromise;
      } else {
        wishlistPagePromise = getCartProducts(userId);
        products = await wishlistPagePromise;
        wishlistPageCache = products;
        wishlistPagePromise = null;
      }
      dispatch(initializeCart(products.map((p) => p.id)));
    };

    loadCart();
  }, [userId, status, dispatch]);

  return (
    <div className="home-container">
      <Filters />
      <ProductList isLoadingExternal={loading} />
    </div>
  );
}