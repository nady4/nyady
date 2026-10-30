"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  deleteMarketingPostAction,
  duplicateMarketingPostAction,
  publishMarketingPostAction,
  toggleMarketingPostStatusAction,
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

export default function PostsAdmin({ posts }: { posts: MarketingPostRow[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (channel && !post.channels.includes(channel)) return false;
      if (status && post.status !== status) return false;
      if (
        term &&
        !post.title.toLowerCase().includes(term) &&
        !post.body.toLowerCase().includes(term) &&
        !(post.campaign ?? "").toLowerCase().includes(term) &&
        !(post.productName ?? "").toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [posts, search, channel, status]);

  const run = async (
    action: () => Promise<AdminActionResult>,
    okText = "Listo"
  ) => {
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
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="admin-input"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
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
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="ready">Listo para publicar</option>
        </select>
        {posts.length === 0 && (
          <Link href="/admin/marketing/nuevo" className="admin-button primary">
            + Nuevo post
          </Link>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="admin-empty">
          {posts.length === 0
            ? "Sin posteos todavía. Creá el primero desde el composer."
            : "Ningún post coincide con el filtro."}
        </p>
      ) : (
        <div className="admin-mkt-posts-list">
          {filtered.map((post) => (
            <div key={post.id} className="admin-mkt-post-card">
              {post.media[0] ? (
                <div className="admin-mkt-post-cover">
                  <Image
                    src={post.media[0]}
                    alt={post.title}
                    width={96}
                    height={96}
                    unoptimized
                  />
                </div>
              ) : (
                <div className="admin-mkt-post-cover empty" aria-hidden="true" />
              )}

              <div className="admin-mkt-post-main">
                <div className="admin-mkt-post-head">
                  <strong className={post.status === "draft" ? "admin-mkt-muted" : ""}>
                    {post.title}
                  </strong>
                  <span
                    className={`admin-status-badge ${
                      post.status === "ready" ? "available" : "unavailable"
                    }`}
                  >
                    {post.status === "ready" ? "Listo" : "Borrador"}
                  </span>
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
            </div>

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
                {post.status === "ready" &&
                  !post.published &&
                  (post.channels.includes("facebook") ||
                    post.channels.includes("instagram")) && (
                    <button
                      type="button"
                      className="admin-button small primary"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => publishMarketingPostAction(post.id),
                          "Solicitud enviada a Meta"
                        )
                      }
                    >
                      Publicar ahora
                    </button>
                  )}
                <button
                  type="button"
                  className="admin-button small"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => toggleMarketingPostStatusAction(post.id),
                      post.status === "ready" ? "Marcado como borrador" : "Marcado como listo"
                    )
                  }
                >
                  {post.status === "ready" ? "A borrador" : "A listo"}
                </button>
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
    </div>
  );
}
