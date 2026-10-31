"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createDraftFromVariantAction,
  generatePostVariantsAction,
  type PostVariant,
} from "@/actions/admin/marketing";
import type { MarketingStatsData } from "@/lib/marketing/insights";

/**
 * "Lo que funciona" (phase 5).
 *
 * The stats panel ranks the published posts by index (weighted interactions
 * per 1000 reached accounts). From here the admin can take a winner and ask
 * the AI for three new angles of the same piece — the loop that turns
 * measurement into content instead of guesswork.
 */
export default function TopPostsCard({
  topPosts,
  bottomPosts,
}: {
  topPosts: MarketingStatsData["topPosts"];
  bottomPosts: MarketingStatsData["bottomPosts"];
}) {
  const router = useRouter();
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [variants, setVariants] = useState<
    { postId: string; items: PostVariant[] } | null
  >(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );

  const generate = async (postId: string) => {
    setMessage(null);
    setVariants(null);
    setBusyPostId(postId);
    try {
      const result = await generatePostVariantsAction(postId);
      if (!result.ok || !result.variants) {
        setMessage({ kind: "error", text: result.error ?? "No se pudo generar" });
        return;
      }
      setVariants({ postId, items: result.variants });
    } catch {
      setMessage({ kind: "error", text: "Error de conexión. Reintentá." });
    } finally {
      setBusyPostId(null);
    }
  };

  const createDraft = async (postId: string, variant: PostVariant, index: number) => {
    setMessage(null);
    setCreating(`${postId}-${index}`);
    try {
      const result = await createDraftFromVariantAction(postId, variant);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error ?? "No se pudo crear" });
        return;
      }
      setMessage({
        kind: "ok",
        text: "Borrador creado. Revisalo y programalo desde la biblioteca de posts.",
      });
      setVariants(null);
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Error de conexión. Reintentá." });
    } finally {
      setCreating(null);
    }
  };

  if (topPosts.length === 0) {
    return (
      <div className="admin-card admin-mkt-top">
        <h3 className="admin-card-title">Lo que funciona</h3>
        <p className="admin-empty">
          Todavía no hay posts con métricas. Publicá, esperá el sync y acá va a
          aparecer el ranking por índice (interacciones ponderadas por alcance).
        </p>
      </div>
    );
  }

  return (
    <div className="admin-card admin-mkt-top">
      <div className="admin-mkt-stats-head">
        <h3 className="admin-card-title">Lo que funciona</h3>
        <span className="admin-cell-sub">
          Ordenado por índice (guardados y compartidos pesan más)
        </span>
      </div>

      {message && (
        <p
          className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}
          role="status"
        >
          {message.text}
        </p>
      )}

      <div className="admin-table-scroll">
        <table className="admin-table admin-mkt-top-table">
          <thead>
            <tr>
              <th>Post</th>
              <th>Índice</th>
              <th>Interacc.</th>
              <th>Alcance</th>
              <th>Clics</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {topPosts.map((post) => (
              <tr key={post.id}>
                <td title={post.campaign ?? ""}>
                  {post.permalink ? (
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="admin-mkt-linklist"
                    >
                      {post.title}
                    </a>
                  ) : (
                    post.title
                  )}
                  {post.campaign ? (
                    <span className="admin-cell-sub"> · {post.campaign}</span>
                  ) : null}
                </td>
                <td>
                  <strong>{post.index}</strong>
                  <span className="admin-cell-sub"> índice</span>
                </td>
                <td>{post.engagementRate}%</td>
                <td>{post.reach.toLocaleString("es-AR")}</td>
                <td>{post.clicks.toLocaleString("es-AR")}</td>
                <td>
                  <button
                    type="button"
                    className="admin-button small"
                    disabled={busyPostId === post.id}
                    onClick={() => void generate(post.id)}
                  >
                    {busyPostId === post.id ? "Generando…" : "Generar variantes"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {variants && (
        <div className="admin-mkt-ai-variants">
          <p className="admin-field-hint">
            Tres ángulos nuevos para el post ganador. Creá el que te guste como
            borrador y programalo cuando quieras.
          </p>
          {variants.items.map((variant, index) => (
            <div className="admin-mkt-ai-variant" key={`${variants.postId}-${index}`}>
              <p className="admin-mkt-ai-hook">{variant.hook}</p>
              <p className="admin-mkt-ai-body">{variant.body}</p>
              {variant.hashtags.length > 0 && (
                <p className="admin-cell-sub">
                  {variant.hashtags.map((tag) => `#${tag}`).join(" ")}
                </p>
              )}
              {variant.cta && <p className="admin-mkt-ai-cta">{variant.cta}</p>}
              <div className="admin-mkt-ai-variant-actions">
                <button
                  type="button"
                  className="admin-button small primary"
                  disabled={creating === `${variants.postId}-${index}`}
                  onClick={() => void createDraft(variants.postId, variant, index)}
                >
                  {creating === `${variants.postId}-${index}`
                    ? "Creando…"
                    : "Crear borrador"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="admin-field-hint">
        El índice divide las interacciones ponderadas (guardados 4, compartidos
        4, clics 3, comentarios 3, likes 1) por el alcance. Sirve para
        comparar posts de tamaños distintos.
      </p>

      {bottomPosts.length > 0 && (
        <>
          <h4 className="admin-content-section-title">Lo que no funcionó</h4>
          <p className="admin-field-hint">
            Los tres posts con peor índice entre los que tuvieron alcance real.
            No los repitas tal cual: cambiá el ángulo, el formato o el
            horario.
          </p>
          <div className="admin-table-scroll">
            <table className="admin-table admin-mkt-top-table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Índice</th>
                  <th>Interacc.</th>
                  <th>Alcance</th>
                  <th>Clics</th>
                </tr>
              </thead>
              <tbody>
                {bottomPosts.map((post) => (
                  <tr key={post.id}>
                    <td title={post.campaign ?? ""}>
                      {post.permalink ? (
                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="admin-mkt-linklist"
                        >
                          {post.title}
                        </a>
                      ) : (
                        post.title
                      )}
                      {post.campaign ? (
                        <span className="admin-cell-sub"> · {post.campaign}</span>
                      ) : null}
                    </td>
                    <td>
                      <strong>{post.index}</strong>
                      <span className="admin-cell-sub"> índice</span>
                    </td>
                    <td>{post.engagementRate}%</td>
                    <td>{post.reach.toLocaleString("es-AR")}</td>
                    <td>{post.clicks.toLocaleString("es-AR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="admin-field-hint">
        <Link href="/admin/marketing/embudo">Ver embudo de ventas</Link> ·
        <Link href="/admin/marketing/calendario"> Planificar la semana</Link>
      </p>
    </div>
  );
}
