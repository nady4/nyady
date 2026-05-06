"use client";
import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { toggleSize, toggleColor } from "@/store/slices/filterSlice";
import { useGetFilters } from "@/hooks/useGetFilters";
import { inter } from "@/app/fonts";
import "@/styles/SearchBar.scss";

const COLOR_HEX: Record<string, string> = {
  black: "#1a1a1a",
  white: "#ffffff",
  red: "#e74c3c",
  blue: "#3498db",
  green: "#27ae60",
  yellow: "#f1c40f",
  pink: "#e91e63",
  purple: "#9b59b6",
  orange: "#e67e22",
  brown: "#8b4513",
  gray: "#6b7280",
  grey: "#6b7280",
  navy: "#1e3a5f",
  beige: "#f5f5dc",
  tan: "#d2b48c",
};

function getColorHex(color: string): string {
  if (color.startsWith("#")) return color;
  return COLOR_HEX[color.toLowerCase()] || "#cccccc";
}

const CHUNK_SIZE = 6;

function SizeFilter() {
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
}

function ColorFilter() {
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
          title={color}
        >
          <span
            className="color-circle"
            style={{ backgroundColor: getColorHex(color) }}
          />
        </button>
      ))}
    </div>
  );
}

export default function SizeColorFilters() {
  return (
    <div className="size-color-filters">
      <SizeFilter />
      <ColorFilter />
    </div>
  );
}