"use client";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { setSearchTerm } from "@/store/slices/searchTermSlice";
import { inter } from "@/app/fonts";
import SizeColorFilters from "./SizeColorFilters";
import PriceFilter from "./PriceFilter";
import "@/styles/SearchBar.scss";

function SearchBar() {
  const dispatch = useAppDispatch();

  const searchTermState = useAppSelector(
    (state) => state.searchTerm as string | undefined
  );
  const searchTerm = searchTermState ?? "";

  return (
    <div className="search-bar-container">
      <div className="search-bar-row">
        <SizeColorFilters />
        <div className="search-box">
          <input
            type="text"
            className={`${inter.className} search-input`}
            value={searchTerm}
            onChange={(e) => dispatch(setSearchTerm(e.target.value))}
            placeholder="Buscar productos..."
          />
          <button
            className="search-button"
            onClick={() => dispatch(setSearchTerm(searchTerm))}
          >
            <Image src="/assets/icons/search.svg" alt="search icon" width={20} height={20} />
          </button>
        </div>
        <div className="price-filter-wrapper">
          <PriceFilter />
        </div>
      </div>
    </div>
  );
}

export default SearchBar;