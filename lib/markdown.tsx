import React from "react";

/**
 * Minimal markdown renderer for admin-editable info pages. Line-based:
 * headings (##, ###), unordered lists (- ), ordered lists (1. ), highlight
 * blocks (> …) and paragraphs. Inline: **bold**, *em* / _em_, [text](link).
 * Links are restricted to same-site paths and https URLs. Server-only usage
 * (info dynamic route) — no "use client" imports involved.
 */

const INLINE_LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;
const EM_RE = /(^|[^*])\*([^*\n]+)\*/g;
const UNDERSCORE_EM_RE = /_([^_\n]+)_/g;

function isValidHref(href: string): boolean {
  return href.startsWith("/") || href.startsWith("https://") || href.startsWith("mailto:");
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];

  // Tokenize by scanning for the earliest of: link, bold, em patterns.
  const tokens: { index: number; length: number; node: React.ReactNode }[] = [];

  for (const match of text.matchAll(INLINE_LINK_RE)) {
    const [, label, href] = match;
    if (isValidHref(href)) {
      tokens.push({
        index: match.index ?? 0,
        length: match[0].length,
        node: (
          <a key={`${keyPrefix}l${match.index}`} href={href}>
            {label}
          </a>
        ),
      });
    }
  }
  for (const match of text.matchAll(BOLD_RE)) {
    tokens.push({
      index: match.index ?? 0,
      length: match[0].length,
      node: <strong key={`${keyPrefix}b${match.index}`}>{match[1]}</strong>,
    });
  }
  for (const match of text.matchAll(EM_RE)) {
    const emIndex = (match.index ?? 0) + (match[1]?.length ?? 0);
    tokens.push({
      index: emIndex,
      length: match[0].length - (match[1]?.length ?? 0),
      node: <em key={`${keyPrefix}e${match.index}`}>{match[2]}</em>,
    });
  }
  for (const match of text.matchAll(UNDERSCORE_EM_RE)) {
    tokens.push({
      index: match.index ?? 0,
      length: match[0].length,
      node: <em key={`${keyPrefix}u${match.index}`}>{match[1]}</em>,
    });
  }

  tokens.sort((a, b) => a.index - b.index);

  let lastEnd = 0;
  for (const token of tokens) {
    if (token.index < lastEnd) continue; // overlapping match — skip
    if (token.index > lastEnd) {
      nodes.push(text.slice(lastEnd, token.index));
    }
    nodes.push(token.node);
    lastEnd = token.index + token.length;
  }
  if (lastEnd < text.length) {
    nodes.push(text.slice(lastEnd));
  }
  return nodes;
}

export function renderMarkdown(markdown: string): React.ReactNode {
  const lines = markdown.trim().split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: { ordered: boolean; items: string[] } | null = null;

  const flushList = (key: string) => {
    if (!listItems) return;
    const { ordered, items } = listItems;
    const children = items.map((item, idx) => (
      <li key={`${key}li${idx}`}>{renderInline(item, `${key}li${idx}-`)}</li>
    ));
    blocks.push(
      ordered ? <ol key={key}>{children}</ol> : <ul key={key}>{children}</ul>
    );
    listItems = null;
  };

  let highlightBuffer: string[] | null = null;
  const flushHighlight = (key: string) => {
    if (!highlightBuffer) return;
    const text = highlightBuffer.join("\n");
    blocks.push(
      <div key={key} className="highlight">
        {text.split("\n").map((line, idx) => (
          <p key={`${key}hp${idx}`}>{renderInline(line, `${key}hp${idx}-`)}</p>
        ))}
      </div>
    );
    highlightBuffer = null;
  };

  const orderedRe = /^\d+[-.)]\s+/;

  lines.forEach((rawLine, index) => {
    const line = rawLine.trimEnd();
    const key = String(index);

    if (line.startsWith(">")) {
      flushList(`f${key}`);
      highlightBuffer ??= [];
      highlightBuffer.push(line.replace(/^>\s?/, ""));
      return;
    }
    flushHighlight(`f${key}`);

    if (!line.trim()) {
      flushList(`f${key}`);
      return;
    }

    if (line.startsWith("### ")) {
      flushList(`f${key}`);
      blocks.push(<h3 key={key}>{renderInline(line.slice(4), `${key}h3`)}</h3>);
      return;
    }
    if (line.startsWith("## ")) {
      flushList(`f${key}`);
      blocks.push(<h2 key={key}>{renderInline(line.slice(3), `${key}h2`)}</h2>);
      return;
    }

    if (line.startsWith("- ")) {
      if (!listItems || listItems.ordered) {
        flushList(`f${key}`);
        listItems = { ordered: false, items: [] };
      }
      listItems.items.push(line.slice(2));
      return;
    }

    if (orderedRe.test(line)) {
      if (!listItems || !listItems.ordered) {
        flushList(`f${key}`);
        listItems = { ordered: true, items: [] };
      }
      listItems.items.push(line.replace(orderedRe, ""));
      return;
    }

    flushList(`f${key}`);
    blocks.push(<p key={key}>{renderInline(line, `${key}p`)}</p>);
  });

  flushList("flast");
  flushHighlight("fhlast");

  return <>{blocks}</>;
}
