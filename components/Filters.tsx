"use client";
import { useCallback, ChangeEvent } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { useGetFilters } from "@/hooks/useGetFilters";
import { useCartTotalQuantity } from "@/hooks/useCartTotalQuantity";
import { toggleSize, toggleColor } from "@/store/slices/filterSlice";
import { setMin, setMax } from "@/store/slices/priceSlice";
import { inter } from "@/app/fonts";
import { getColorSwatchStyle } from "@/lib/colors";
import { formatARS } from "@/lib/money";
import WholesaleNudge from "@/components/WholesaleNudge";
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
    <div
      role="group"
      aria-label="Filtrar por talle"
      className="size-filter"
    >
      {sizeChunks.map((chunk, chunkIdx) => (
        <div key={chunkIdx} className="size-row">
          {chunk.map((size) => (
            <button
              key={size}
              type="button"
              className={`${inter.className} size-button ${activeSizes[size] ? "active" : ""}`}
              onClick={() => handleClick(size)}
              aria-pressed={Boolean(activeSizes[size])}
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
    <div
      role="group"
      aria-label="Filtrar por color"
      className="color-filter"
    >
      {allColors.map((color) => (
        <button
          key={color}
          type="button"
          className={`color-button ${activeColors[color] ? "active" : ""}`}
          onClick={() => handleClick(color)}
          title={color}
          aria-pressed={Boolean(activeColors[color])}
          aria-label={`Color ${color}`}
        >
          <span
            className="color-circle"
            style={getColorSwatchStyle(color)}
          />
        </button>
      ))}
    </div>
  );
};

const PriceFilter = () => {
  const dispatch = useAppDispatch();

  const priceState = useAppSelector(
    (state) =>
      state.price as {
        boundsMin: number;
        boundsMax: number;
        min: number | null;
        max: number | null;
      } | undefined
  );

  const boundsMin = priceState?.boundsMin ?? 0;
  const boundsMax = priceState?.boundsMax ?? 50000;

  const min = priceState?.min ?? boundsMin;
  const max = priceState?.max ?? boundsMax;

  const handleMinChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const rawValue = Number(event.target.value);
      const value = Math.round(rawValue / 1000) * 1000;
      dispatch(setMin(Math.max(boundsMin, Math.min(value, boundsMax - 1000))));
    },
    [dispatch, boundsMin, boundsMax]
  );

  const handleMaxChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const rawValue = Number(event.target.value);
      const value = Math.round(rawValue / 1000) * 1000;
      dispatch(setMax(Math.min(boundsMax, Math.max(value, boundsMin + 1000))));
    },
    [dispatch, boundsMin, boundsMax]
  );

  const safeMin = Math.max(boundsMin, Math.min(min, boundsMax));
  const safeMax = Math.min(boundsMax, Math.max(max, boundsMin));

  const span = Math.max(boundsMax - boundsMin, 1000);
  const minPercent = ((safeMin - boundsMin) / span) * 100;
  const maxPercent = ((safeMax - boundsMin) / span) * 100;

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
        min={boundsMin}
        max={boundsMax}
        step={1000}
        value={safeMin}
        onChange={handleMinChange}
        className="price-filter-input min-range"
        aria-label="Precio mínimo"
        aria-valuetext={`${Math.round(safeMin / 1000)} mil pesos`}
      />
      <input
        type="range"
        min={boundsMin}
        max={boundsMax}
        step={1000}
        value={safeMax}
        onChange={handleMaxChange}
        className="price-filter-input max-range"
        aria-label="Precio máximo"
        aria-valuetext={`${Math.round(safeMax / 1000)} mil pesos`}
      />
      <div className="range-values">
        <span className="min-value" style={{ left: `${minPercent}%` }}>
          {formatARS(safeMin)}
        </span>
        <span className="max-value" style={{ left: `${maxPercent}%` }}>
          {formatARS(safeMax)}
        </span>
      </div>
    </div>
  );
};

export default function Filters() {
  const cartTotalQuantity = useCartTotalQuantity();

  return (
    <div className="filters-container">
      <SizeFilter />
      <ColorFilter />
      <PriceFilter />
      <WholesaleNudge
        totalQuantity={cartTotalQuantity}
        showRevendedoraApplied
      />
    </div>
  );
}

export { SizeFilter, ColorFilter, PriceFilter };
