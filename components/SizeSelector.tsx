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
    <div className="size-selector">
      {sizes.map((size) => (
        <button
          key={size}
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