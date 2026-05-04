"use client";
import { useLoadPageData } from "@/hooks/useLoadPageData";
import SearchBar from "@/components/SearchBar";
import ProductList from "@/components/ProductList";

export default function CatalogPage() {
  const { loading } = useLoadPageData("catalog");

  return (
    <div className="home-container">
      <SearchBar />
      <ProductList isLoadingExternal={loading} />
    </div>
  );
}