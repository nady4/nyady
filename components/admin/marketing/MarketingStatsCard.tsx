"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { syncMarketingInsightsAction } from "@/actions/admin/marketing";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { MarketingStatsData } from "@/lib/marketing/insights";

/**
 * Marketing stats panel (phase 3). Server page provides the data; this card
 * only renders it and drives the "Sincronizar ahora" server action.
 */
export default function MarketingStatsCard({ stats }: { stats: MarketingStatsData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );

  const sync = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const result = await syncMarketingInsightsAction();
      if (result.ok) {
        const failures = result.postsFailed ?? 0;
        setMessage({
          kind: failures > 0 ? "error" : "ok",
          text:
            result.postsSynced === 0
              ? "No había posts publicados para sincronizar."
              : `${result.postsSynced} post(s) sincronizados${failures > 0 ? ` · fallos: ${failures}` : ""}.`,
        });
        router.refresh();
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ kind: "error", text: result.error ?? "No se pudo sincronizar" });
      }
    } catch {
      setMessage({ kind: "error", text: "Error de conexión. Reintentá." });
    } finally {
      setBusy(false);
    }
  };

  // Number formatting helper (compact): 1.2k style for big numbers.
  const fmt = (n: number): string =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

  return (
    <div className="admin-card admin-mkt-stats">
      <div className="admin-mkt-stats-head">
        <h3 className="admin-card-title">Estadísticas de publicaciones</h3>
        <div className="admin-mkt-stats-headright">
          {stats.lastSyncAt && (
            <span className="admin-cell-sub">
              Últ. sync: {formatAdminDateTime(stats.lastSyncAt)}
            </span>
          )}
          <button
            type="button"
            className="admin-button small"
            disabled={busy}
            onClick={() => void sync()}
          >
            {busy ? "Sincronizando…" : "Sincronizar ahora"}
          </button>
        </div>
      </div>

      {message && (
        <p
          className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}
          role={message.kind === "ok" ? "status" : "alert"}
        >
          {message.text}
        </p>
      )}

      <div className="admin-mkt-stats-followers">
        <span className="admin-mkt-channel is-facebook">Facebook</span>
        <strong>
          {stats.followers.facebook
            ? `${stats.followers.facebook.followers.toLocaleString("es-AR")} seguidores`
            : "—"}
        </strong>
        <span className="admin-mkt-channel is-instagram">Instagram</span>
        <strong>
          {stats.followers.instagram
            ? `${stats.followers.instagram.followers.toLocaleString("es-AR")} seguidores`
            : "—"}
        </strong>
      </div>

      {stats.posts.length === 0 ? (
        <p className="admin-empty">
          Todavía no hay métricas. Publicá un post y esperá el primer sync (o tocá
          “Sincronizar ahora”).
        </p>
      ) : (
        <>
          <div className="admin-mkt-stats-totals">
            <span>
              Alcance <strong>{fmt(stats.totals.reach)}</strong>
            </span>
            <span>
              Impresiones <strong>{fmt(stats.totals.impressions ?? 0)}</strong>
            </span>
            <span>
              Interacc. <strong>{fmt(stats.totals.likes)}</strong>
            </span>
            <span>
              Comentarios <strong>{fmt(stats.totals.comments)}</strong>
            </span>
            <span>
              Compart. <strong>{fmt(stats.totals.shares)}</strong>
            </span>
            <span>
              Guardados <strong>{fmt(stats.totals.saves)}</strong>
            </span>
            <span>
              Clics <strong>{fmt(stats.totals.clicks)}</strong>
            </span>
          </div>

          <div className="admin-table-scroll">
            <table className="admin-table admin-mkt-stats-table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Publicado</th>
                  <th>Alcance</th>
                  <th>Interacc.</th>
                  <th>Coment.</th>
                  <th>Guard.</th>
                  <th>Clics</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {stats.posts.map((post) => (
                  <tr key={post.id}>
                    <td title={post.campaign ?? ""}>
                      {post.title}
                      {post.campaign ? (
                        <span className="admin-cell-sub"> · {post.campaign}</span>
                      ) : null}
                    </td>
                    <td>{formatAdminDateTime(post.publishedAt)}</td>
                    <td>{post.reach.toLocaleString("es-AR")}</td>
                    <td>{post.likes.toLocaleString("es-AR")}</td>
                    <td>{post.comments.toLocaleString("es-AR")}</td>
                    <td>{post.saves.toLocaleString("es-AR")}</td>
                    <td>{post.clicks.toLocaleString("es-AR")}</td>
                    <td>
                      {post.permalink ? (
                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="admin-mkt-linklist"
                        >
                          Ver
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="admin-field-hint">
        Los números son snapshots diarios de Meta (el cron corre a las 12:00 ART). Los
        clics miden interacciones del post; el tráfico real se atribuye con los UTM
        automáticos en los links de producto.
      </p>
    </div>
  );
}
