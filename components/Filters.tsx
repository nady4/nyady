"use client";
import { useCallback, ChangeEvent } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { useGetFilters } from "@/hooks/useGetFilters";
import { toggleSize, toggleColor } from "@/store/slices/filterSlice";
import { setMin, setMax } from "@/store/slices/priceSlice";
import { setSearchTerm } from "@/store/slices/searchTermSlice";
import { inter } from "@/app/fonts";
import Image from "next/image";
import { getColorHex } from "@/lib/colors";
import "@/styles/PriceFilter.scss";
import "@/styles/Filters.scss";

const SizeFilter = () => {
  const dispatch = useAppDispatch();
  const { allSizes } = useGetFilters();
  const activeSizes = useAppSelector((state) => state.filters.activeSizes);

  const handleClick = useCallback(
    (size: string) => {
      dispatch(toggleSize(size));
    },
    [dispatch]
  );

  if (!allSizes.length) return null;

  const CHUNK_SIZE = Math.ceil(allSizes.length / 2);
  const sizeChunks = [];
  for (let i = 0; i < allSizes.length; i += CHUNK_SIZE) {
    sizeChunks.push(allSizes.slice(i, i + CHUNK_SIZE));
  }

  return (
    <div className="size-filter">
      {sizeChunks.map((chunk, chunkIdx) => (
        <div key={chunkIdx} className="size-row">
          {chunk.map((size) => (
            <button
              key={size}
              className={`${inter.className} size-button ${activeSizes[size] ? "active" : ""}`}
              onClick={() => handleClick(size)}
            >
              {size}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

const ColorFilter = () => {
  const dispatch = useAppDispatch();
  const { allColors } = useGetFilters();
  const activeColors = useAppSelector((state) => state.filters.activeColors);

  const handleClick = useCallback(
    (color: string) => {
      dispatch(toggleColor(color));
    },
    [dispatch]
  );

  if (!allColors.length) return null;

  return (
    <div className="color-filter">
      {allColors.map((color) => (
        <button
          key={color}
          className={`color-button ${activeColors[color] ? "active" : ""}`}
          onClick={() => handleClick(color)}
        >
          <span
            className="color-circle"
            style={{ backgroundColor: getColorHex(color) }}
          />
          <span className="color-label">{color}</span>
        </button>
      ))}
    </div>
  );
};

const PriceFilter = () => {
  const dispatch = useAppDispatch();

  const priceState = useAppSelector(
    (state) => state.price as { min: number; max: number } | undefined
  );

  const min = priceState?.min ?? 0;
  const max = priceState?.max ?? 50000;

  const minLimit = 20000;
  const maxLimit = 30000;

  const handleMinChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const rawValue = Number(event.target.value);
      const value = Math.round(rawValue / 1000) * 1000;
      dispatch(setMin(Math.max(minLimit, Math.min(value, max - 1000))));
    },
    [dispatch, max]
  );

  const handleMaxChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const rawValue = Number(event.target.value);
      const value = Math.round(rawValue / 1000) * 1000;
      dispatch(setMax(Math.max(value, min + 1000)));
    },
    [dispatch, min]
  );

  const safeMin = Math.max(minLimit, Math.min(min, maxLimit - 1000));
  const safeMax = Math.min(maxLimit, Math.max(max, minLimit + 1000));

  const minPercent = ((safeMin - minLimit) / (maxLimit - minLimit)) * 100;
  const maxPercent = ((safeMax - minLimit) / (maxLimit - minLimit)) * 100;

  return (
    <div
      className="price-filter"
      style={
        {
          "--min": `${minPercent}%`,
          "--max": `${maxPercent}%`
        } as React.CSSProperties
      }
    >
      <input
        type="range"
        min={minLimit}
        max={maxLimit}
        step={1000}
        value={safeMin}
        onChange={handleMinChange}
        className="price-filter-input min-range"
      />
      <input
        type="range"
        min={minLimit}
        max={maxLimit}
        step={1000}
        value={safeMax}
        onChange={handleMaxChange}
        className="price-filter-input max-range"
      />
      <div className="range-values">
        <span className="min-value" style={{ left: `${minPercent}%` }}>
          {Math.round(safeMin / 1000)}k
        </span>
        <span className="max-value" style={{ left: `${maxPercent}%` }}>
          {Math.round(safeMax / 1000)}k
        </span>
      </div>
    </div>
  );
};

const TextFilter = ({
  searchTerm,
  dispatch
}: {
  searchTerm: string;
  dispatch: ReturnType<typeof useAppDispatch>;
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      dispatch(setSearchTerm(searchTerm));
    }
  };

  return (
    <div className="text-filter">
      <input
        type="text"
        className={`${inter.className} text-input`}
        value={searchTerm}
        onChange={(e) => dispatch(setSearchTerm(e.target.value))}
        onKeyDown={handleKeyDown}
        placeholder="Buscar productos..."
      />
      <button
        className="text-button"
        onClick={() => dispatch(setSearchTerm(searchTerm))}
      >
        <Image
          src="/assets/icons/search.svg"
          alt="search icon"
          width={20}
          height={20}
        />
      </button>
    </div>
  );
};

export default function Filters() {
  const searchTermState = useAppSelector(
    (state) => state.searchTerm as string | undefined
  );
  const searchTerm = searchTermState ?? "";
  const dispatch = useAppDispatch();

  return (
    <div className="filters-container">
      <SizeFilter />
      <ColorFilter />
      <PriceFilter />
      <TextFilter searchTerm={searchTerm} dispatch={dispatch} />
    </div>
  );
}

export { SizeFilter, ColorFilter, TextFilter, PriceFilter };
