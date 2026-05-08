"use client";
import { memo } from "react";

const COLOR_HEX: Record<string, string> = {
  Negro: "#1a1a1a",
  Marrón: "#8b4513",
  Gris: "#6b7280",
  Beige: "#f5f5dc",
  "Rosa claro": "#ffb6c1",
  Fucsia: "#ff00ff",
  Bordó: "#800020",
  Caspeado: "#333333",
  Camel: "#c19a6b",
  Violeta: "#8b00ff",
  "Animal Print": "#d2b48c",
};

function getColorHex(colorName: string): string {
  const key = Object.keys(COLOR_HEX).find(
    (k) => k.toLowerCase() === colorName.toLowerCase()
  );
  return COLOR_HEX[key || ""] || colorName;
}

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
export { getColorHex };