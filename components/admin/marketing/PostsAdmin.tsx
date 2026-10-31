"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  deleteMarketingPostAction,
  duplicateMarketingPostAction,
  publishMarketingPostAction,
} from "@/actions/admin/marketing";
import type { AdminActionResult, MarketingPostRow } from "@/types/admin";

const CHANNEL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

const CHANNEL_COLORS: Record<string, string> = {
  facebook: "is-facebook",
  instagram: "is-instagram",
  whatsapp: "is-whatsapp",
};

export interface PostsFilters {
  q: string;
  channel: string;
  status: string;
  published: string; // "" (todos) | "pending" | "published"
}

export interface PublishPendingTarget {
  id: string;
  title: string;
}

const SEARCH_DEBOUNCE_MS = 500;

/**
 * Posts list with server-side pagination: filters/status live in the URL
 * (searchParams) and rows arrive pre-filtered. The "Publicar pendientes"
 * button targets the full pending list across pages (server-computed).
 */
export default function PostsAdmin({
  posts,
  filters,
  page,
  perPage,
  total,
  pendingTargets,
}: {
  posts: MarketingPostRow[];
  filters: PostsFilters;
  page: number;
  perPage: number;
  total: number;
  pendingTargets: PublishPendingTarget[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.q);
  // Publish-everything-pending toolbar loop state.
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    done: number;
    total: number;
    current: string;
  } | null>(null);
  const [bulkResults, setBulkResults] = useState<string[]>([]);

  // Keep the search box in sync when navigation resets server filters.
  useEffect(() => {
    setSearchValue(filters.q);
  }, [filters.q]);

  /** Merges current filters with overrides and navigates (page resets to 1). */
  const pushFilters = (overrides: Partial<PostsFilters>, pageParam?: number) => {
    const next: PostsFilters = { ...filters, ...overrides };
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.channel) params.set("channel", next.channel);
    if (next.status) params.set("status", next.status);
    if (next.published) params.set("published", next.published);
    const targetPage = pageParam ?? 1;
    if (targetPage > 1) params.set("page", String(targetPage));
    router.push(`/admin/marketing${params.size > 0 ? `?${params.toString()}` : ""}`);
  };

  // Debounced search: the user types and the URL updates automatically.
  useEffect(() => {
    if (searchValue === filters.q) return;
    const timer = setTimeout(() => {
      pushFilters({ q: searchValue }, 1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const run = async (action: () => Promise<AdminActionResult>, okText = "Listo") => {
    setMessage(null);
    setBusy(true);
    try {
      const result = await action();
      if (result.ok) {
        setMessage({ kind: "ok", text: okText });
        router.refresh();
        setTimeout(() => setMessage(null), 2500);
      } else {
        setMessage({ kind: "error", text: result.error ?? "No se pudo completar" });
      }
    } catch {
      setMessage({ kind: "error", text: "Error de conexión. Reintentá." });
    } finally {
      setBusy(false);
    }
  };

  const BULK_DELAY_MS = 4000;
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  /** Sequential Meta publish over every pending target (server-computed full list). */
  const publishPending = async () => {
    if (pendingTargets.length === 0 || bulkBusy || busy) return;
    setBulkBusy(true);
    setBulkResults([]);
    setMessage(null);
    let ok = 0;
    let failed = 0;
    const lines: string[] = [];
    try {
      for (let index = 0; index < pendingTargets.length; index += 1) {
        const target = pendingTargets[index];
        setBulkProgress({
          done: index,
          total: pendingTargets.length,
          current: target.title,
        });
        try {
          const result = await publishMarketingPostAction(target.id);
          if (result.ok) {
            const summary = Object.entries(result.results ?? {})
              .map(([channelName, outcome]) =>
                outcome.ok
                  ? `${channelName === "facebook" ? "Facebook" : "Instagram"} ✓`
                  : `${channelName === "facebook" ? "Facebook" : "Instagram"} ✗ ${outcome.error ?? ""}`.trim()
              )
              .filter(Boolean)
              .join(" · ");
            const allFailed =
              result.results &&
              Object.values(result.results).length > 0 &&
              Object.values(result.results).every((outcome) => !outcome.ok);
            if (allFailed) {
              failed += 1;
              lines.push(
                `✗ ${target.title} — ${result.results?.facebook?.error ?? result.results?.instagram?.error ?? "fallo"}`
              );
            } else {
              ok += 1;
              lines.push(`✓ ${target.title} — ${summary || "publicado"}`);
            }
          } else {
            failed += 1;
            lines.push(`✗ ${target.title} — ${result.error ?? "fallo"}`);
          }
        } catch {
          failed += 1;
          lines.push(`✗ ${target.title} — error de conexión`);
        }
        if (index < pendingTargets.length - 1) await wait(BULK_DELAY_MS);
      }
      setMessage({
        kind: failed > 0 && ok === 0 ? "error" : "ok",
        text: `Publicados: ${ok} · Fallidos: ${failed}.`,
      });
      router.refresh();
    } finally {
      setBulkProgress(null);
      setBulkResults(lines);
      setBulkBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  /** Preserves all filters while moving to another page. */
  const pageHref = (targetPage: number): string => {
    const params = new URLSearchParams();
    if (filters.q.trim()) params.set("q", filters.q.trim());
    if (filters.channel) params.set("channel", filters.channel);
    if (filters.status) params.set("status", filters.status);
    if (filters.published) params.set("published", filters.published);
    if (targetPage > 1) params.set("page", String(targetPage));
    return `/admin/marketing${params.size > 0 ? `?${params.toString()}` : ""}`;
  };

  const rowBadge = (post: MarketingPostRow) =>
    post.published ? "Publicado" : post.status === "ready" ? "Listo" : "Borrador";

  return (
    <div className="admin-mkt-posts">
      {message && (
        <p
          className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}
          role={message.kind === "ok" ? "status" : "alert"}
        >
          {message.text}
        </p>
      )}

      <div className="admin-mkt-posts-toolbar">
        <input
          type="search"
          className="admin-input"
          placeholder="Buscar por título, copy, campaña o producto…"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <select
          className="admin-input"
          value={filters.channel}
          onChange={(e) => pushFilters({ channel: e.target.value }, 1)}
          aria-label="Filtrar por canal"
        >
          <option value="">Todos los canales</option>
          {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          value={filters.status}
          onChange={(e) => pushFilters({ status: e.target.value }, 1)}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="ready">Listo para publicar</option>
        </select>
        <select
          className="admin-input"
          value={filters.published || ""}
          onChange={(e) => pushFilters({ published: e.target.value }, 1)}
          aria-label="Filtrar por publicación"
        >
          <option value="">Todo lo tanto</option>
          <option value="pending">Sin publicar</option>
          <option value="published">Publicados</option>
        </select>
        <Link href="/admin/marketing/nuevo" className="admin-button">
          + Nuevo post
        </Link>
        {pendingTargets.length > 0 && (
          <button
            type="button"
            className="admin-button primary"
            disabled={bulkBusy || busy}
            title={`Publica secuencialmente los ${pendingTargets.length} pendientes (4s entre cada uno)`}
            onClick={() => void publishPending()}
          >
            {bulkBusy && bulkProgress
              ? `Publicando ${bulkProgress.done + 1}/${bulkProgress.total}…`
              : `Publicar pendientes (${pendingTargets.length})`}
          </button>
        )}
      </div>

      {bulkProgress && (
        <p className="admin-field-hint" role="status">
          Publicando {bulkProgress.done + 1}/{bulkProgress.total}: {bulkProgress.current}…
        </p>
      )}
      {bulkResults.length > 0 && (
        <div className="admin-mkt-bulkpub-results">
          {bulkResults.map((line, index) => (
            <p key={index} className={line.startsWith("✓") ? "admin-saved-hint" : "admin-error"}>
              {line}
            </p>
          ))}
        </div>
      )}

      <div className="admin-mkt-pager">
        <span>
          {total} posteo(s) · página {page} de {totalPages}
        </span>
        <span className="admin-mkt-pager-links">
          {page > 1 && (
            <Link className="admin-button small" href={pageHref(page - 1)}>
              ‹ Anterior
            </Link>
          )}
          {page < totalPages && (
            <Link className="admin-button small" href={pageHref(page + 1)}>
              Siguiente ›
            </Link>
          )}
        </span>
      </div>

      {posts.length === 0 ? (
        <p className="admin-empty">
          {total === 0
            ? "Sin posteos todavía. Creá el primero desde el composer o el creator en masa."
            : "Ningún post coincide con el filtro/página."}
        </p>
      ) : (
        <div className="admin-mkt-posts-list">
          {posts.map((post) => (
            <div key={post.id} className="admin-mkt-post-card">
              {post.media[0] ? (
                <div className="admin-mkt-post-cover">
                  <Image
                    src={post.media[0]}
                    alt={post.title}
                    width={72}
                    height={72}
                    unoptimized
                  />
                </div>
              ) : (
                <div className="admin-mkt-post-cover empty" aria-hidden="true" />
              )}

              <div className="admin-mkt-post-main">
                <div className="admin-mkt-post-head">
                  <strong className={post.status === "draft" && !post.published ? "admin-mkt-muted" : ""}>
                    {post.title}
                  </strong>
                  {post.published ? (
                    <span className="admin-status-badge available">Publicado</span>
                  ) : (
                    <span
                      className={`admin-status-badge ${
                        post.status === "ready" ? "available" : "unavailable"
                      }`}
                    >
                      {rowBadge(post)}
                    </span>
                  )}
                </div>
                <p className="admin-mkt-post-body" title={post.body}>
                  {post.body.slice(0, 110)}
                  {post.body.length > 110 ? "…" : ""}
                </p>
                <div className="admin-mkt-post-meta">
                  {post.channels.map((c) => (
                    <span
                      key={c}
                      className={`admin-mkt-channel ${CHANNEL_COLORS[c] ?? ""}`}
                      title={CHANNEL_LABELS[c] ?? c}
                    >
                      {CHANNEL_LABELS[c] ?? c}
                    </span>
                  ))}
                  {post.campaign && <span className="admin-cell-sub">·· {post.campaign}</span>}
                  {post.productSlug && (
                    <Link
                      href={`/products/${post.productSlug}`}
                      className="admin-mkt-linklist"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {post.productName ?? post.productSlug}
                    </Link>
                  )}
                </div>
              </div>

              <div className="admin-mkt-post-dates">
                {post.scheduledAtText
                  ? `Programado: ${post.scheduledAtText}`
                  : `Creado: ${post.dateText}`}
                {post.published && (
                  <span className="admin-mkt-published">
                    · Publicado: {post.publishedText}
                  </span>
                )}
              </div>
              {post.lastError && (
                <p className="admin-error admin-mkt-post-error" role="alert">
                  {post.lastError}
                </p>
              )}

              <div className="admin-mkt-post-links">
                {post.fbPermalink && (
                  <a
                    className="admin-mkt-permalink is-facebook"
                    href={post.fbPermalink}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Ver en Facebook
                  </a>
                )}
                {post.igPermalink && (
                  <a
                    className="admin-mkt-permalink is-instagram"
                    href={post.igPermalink}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Ver en Instagram
                  </a>
                )}
              </div>

              <div className="admin-mkt-post-actions">
                <Link href={`/admin/marketing/${post.id}`} className="admin-button small">
                  Editar
                </Link>
                {!post.published &&
                  (post.channels.includes("facebook") ||
                    post.channels.includes("instagram")) && (
                    <button
                      type="button"
                      className="admin-button small primary"
                      disabled={busy || bulkBusy}
                      onClick={() =>
                        void run(() => publishMarketingPostAction(post.id), "Solicitud enviada a Meta")
                      }
                    >
                      Publicar
                    </button>
                  )}
                <button
                  type="button"
                  className="admin-button small"
                  disabled={busy}
                  onClick={() => void run(() => duplicateMarketingPostAction(post.id), "Post duplicado")}
                >
                  Duplicar
                </button>
                <button
                  type="button"
                  className="admin-button small danger"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`¿Eliminar el post "${post.title}"?`)) {
                      void run(() => deleteMarketingPostAction(post.id), "Post eliminado");
                    }
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > perPage && (
        <div className="admin-mkt-pager">
          <span>
            {total} posteo(s) · página {page} de {totalPages}
          </span>
          <span className="admin-mkt-pager-links">
            {page > 1 && (
              <Link className="admin-button small" href={pageHref(page - 1)}>
                ‹ Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link className="admin-button small" href={pageHref(page + 1)}>
                Siguiente ›
              </Link>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
