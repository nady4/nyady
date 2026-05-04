"use client";
import Image from "next/image";
import { useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/hooks/useStore";
import { setSearchTerm } from "@/store/slices/searchTermSlice";
import { toggleCategory } from "@/store/slices/categorySlice";
import { tomorrow } from "@/app/fonts";
import PriceFilter from "./PriceFilter";
import "@/styles/SearchBar.scss";

function SearchBar() {
  const dispatch = useAppDispatch();

  const categoryState = useAppSelector(
    (state) =>
      state.category as
        | { categories: string[]; activeCategories: Record<string, boolean> }
        | undefined
  );

  const categories = categoryState?.categories ?? [];
  const activeCategories = categoryState?.activeCategories ?? {};

  const searchTermState = useAppSelector(
    (state) => state.searchTerm as string | undefined
  );
  const searchTerm = searchTermState ?? "";

  const onCategoriesClick = useCallback(
    (category: string) => {
      dispatch(toggleCategory(category));
    },
    [dispatch]
  );

  if (categories.length)
    return (
      <div className="search-bar">
        <div className="category-filter">
          {categories.map((category) => (
            <button
              key={category}
              className={`${tomorrow.className} category-button ${
                activeCategories[category] ? "active" : ""
              }`}
              onClick={() => onCategoriesClick(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="search-box">
          <input
            type="text"
            className={`${tomorrow.className} search-input`}
            value={searchTerm}
            onChange={(e) => dispatch(setSearchTerm(e.target.value))}
          />
          <button
            className="search-button"
            onClick={() => dispatch(setSearchTerm(searchTerm))}
          >
            <Image src="/assets/icons/search.svg" alt="search icon" width={20} height={20} />
          </button>
        </div>
        <PriceFilter />
      </div>
    );
}

export default SearchBar;