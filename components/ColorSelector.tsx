"use client";
import { memo } from "react";
import { getColorHex } from "@/lib/colors";

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
    <div className="color-selector">
      {colors.map((color) => (
        <button
          key={color}
          className={`color-circle ${selectedColor === color ? "selected" : ""}`}
          style={{ backgroundColor: getColorHex(color) }}
          onClick={() => onColorChange(color)}
          aria-label={`Select color ${color}`}
        />
      ))}
    </div>
  );
});

export default ColorSelector;