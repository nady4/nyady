"use client";

import { useState } from "react";

interface TagInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  datalistId?: string;
}

/**
 * Comma-friendly tag input: type and press Enter to add, click a chip or
 * Backspace to remove. Used for talles, colores and opciones de taco.
 */
export default function TagInput({
  label,
  values,
  onChange,
  placeholder,
  datalistId,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  const addDraft = () => {
    const value = draft.trim();
    if (!value) return;
    if (!values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      onChange([...values, value]);
    }
    setDraft("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addDraft();
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <label className="admin-field admin-field-wide">
      <span>{label}</span>
      <div className="admin-tag-input">
        {values.map((value) => (
          <span key={value} className="admin-tag">
            {value}
            <button
              type="button"
              aria-label={`Quitar ${value}`}
              onClick={() => onChange(values.filter((v) => v !== value))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          list={datalistId}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={addDraft}
          onKeyDown={handleKeyDown}
        />
      </div>
    </label>
  );
}
