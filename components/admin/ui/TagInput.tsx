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
 * Delimiters that split a pasted/typed chunk into several tags. Commas and
 * semicolons are safe to react to on every keystroke ("a,b,c" flows), while
 * whitespace/newline splitting only happens on real paste events — otherwise
 * typing "sandalias de verano" manually would explode mid-word.
 */
const HARD_SPLIT = /[,;]+/;
const PASTE_SPLIT = /[,\s;]+/;

function normalizeTag(raw: string): string | null {
  const value = raw.trim().replace(/^#+/, "").trim();
  return value || null;
}

function digestChunk(raw: string, splitter: RegExp): string[] {
  return raw
    .split(splitter)
    .map((part) => normalizeTag(part))
    .filter((tag): tag is string => tag !== null);
}

/**
 * Comma-friendly tag input: type and press Enter to add, click a chip or
 * Backspace to remove. Used for talles, colores, hashtags and opciones de
 * taco. Multi-tag pastes (comma, space, semicolon or newline separated —
 * with or without leading #) are split into individual tags automatically.
 */
export default function TagInput({
  label,
  values,
  onChange,
  placeholder,
  datalistId,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  const addMany = (chunks: string[]) => {
    if (chunks.length === 0) return;
    const merged = [...values];
    for (const chunk of chunks) {
      if (!merged.some((v) => v.toLowerCase() === chunk.toLowerCase())) {
        merged.push(chunk);
      }
    }
    onChange(merged);
  };

  const addDraft = () => {
    const value = normalizeTag(draft);
    if (!value) {
      setDraft("");
      return;
    }
    if (!values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      addMany([value]);
    }
    setDraft("");
  };

  /** Comma/semicolon typed (or pasted via drag-drop of text): split inline. */
  const handleDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (HARD_SPLIT.test(raw)) {
      addMany(digestChunk(raw, HARD_SPLIT));
      setDraft("");
      return;
    }
    setDraft(raw);
  };

  /** Full paste handler: multi-tag sets split even without commas. */
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    const tokens = digestChunk(text, PASTE_SPLIT);
    if (tokens.length <= 1) return; // single token: normal typing/paste flow
    e.preventDefault();
    addMany(tokens);
    setDraft("");
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
          onChange={handleDraftChange}
          onPaste={handlePaste}
          onBlur={addDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            } else if (e.key === "Backspace" && !draft && values.length > 0) {
              onChange(values.slice(0, -1));
            }
          }}
        />
      </div>
    </label>
  );
}
