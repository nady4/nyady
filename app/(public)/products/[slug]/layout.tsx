"use client";
import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useCartIdsInit } from "@/hooks/useInitData";

/**
 * Hydrates the cart/wishlist id slices for the product-detail page so hearts
 * and the navbar badge are correct before any click. Runs only when the
 * session exists and fires once per session id.
 */
const ProductLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  useCartIdsInit(userId);

  return <>{children}</>;
};

export default ProductLayout;
