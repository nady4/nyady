"use client";
import type { Metadata } from "next";
import { useSession } from "next-auth/react";
import { useLoadPageData } from "@/hooks/useLoadPageData";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { TextFilter } from "@/components/Filters";
import ProductList from "@/components/ProductList";

import "@/styles/ProductList.scss";

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