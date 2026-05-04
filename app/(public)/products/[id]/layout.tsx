"use client";
import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useInitData } from "@/hooks/useInitData";
import { initializeCart } from "@/store/slices/cartSlice";
import { initializeWishList } from "@/store/slices/wishListSlice";
import { getCartIds } from "@/actions/cart";
import { getWishlistIds } from "@/actions/wishlist";

const initializationTasks = [
  { action: getCartIds, initializer: initializeCart },
  { action: getWishlistIds, initializer: initializeWishList },
];

const ProductLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  useInitData(userId, initializationTasks);

  return <>{children}</>;
};

export default ProductLayout;