"use client";
import { memo } from "react";

interface SizeSelectorProps {
  sizes: string[];
  selectedSize: string;
  onSizeChange: (size: string) => void;
}

const SizeSelector = memo(function SizeSelector({
  sizes,
  selectedSize,
  onSizeChange,
}: SizeSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Talle"
      className="size-selector"
    >
      {sizes.map((size) => (
        <button
          key={size}
          type="button"
          role="radio"
          aria-checked={selectedSize === size}
          className={`size-option ${selectedSize === size ? "selected" : ""}`}
          onClick={() => onSizeChange(size)}
        >
          {size}
        </button>
      ))}
    </div>
  );
});

export default SizeSelector;
