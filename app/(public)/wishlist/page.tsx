"use client";
import { useLoadPageData } from "@/hooks/useLoadPageData";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { TextFilter } from "@/components/Filters";
import ProductList from "@/components/ProductList";

export default function WishlistPage() {
  const { loading } = useLoadPageData("wishlist");
  const dispatch = useAppDispatch();
  const searchTerm = useAppSelector((state) => state.searchTerm) ?? "";

  return (
    <div className="home-container">
      <TextFilter searchTerm={searchTerm} dispatch={dispatch} />
      <ProductList isLoadingExternal={loading} />
    </div>
  );
}
