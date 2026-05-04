"use client";
import { useLoadPageData } from "@/hooks/useLoadPageData";
import SearchBar from "@/components/SearchBar";
import ProductList from "@/components/ProductList";

export default function WishlistPage() {
  const { loading } = useLoadPageData("wishlist");

  return (
    <div className="home-container">
      <SearchBar />
      <ProductList isLoadingExternal={loading} />
    </div>
  );
}