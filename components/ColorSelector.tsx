"use client";
import { memo } from "react";
import { getColorHex } from "@/lib/colors";
import "@/styles/ColorSelector.scss";

interface ColorSelectorProps {
  colors: string[];
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const ColorSelector = memo(function ColorSelector({
  colors,
  selectedColor,
  onColorChange,
}: ColorSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Color"
      className="color-selector"
    >
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={selectedColor === color}
          className={`color-circle ${selectedColor === color ? "selected" : ""}`}
          style={{ backgroundColor: getColorHex(color) }}
          onClick={() => onColorChange(color)}
          aria-label={`Color ${color}`}
        />
      ))}
    </div>
  );
});

export default ColorSelector;
