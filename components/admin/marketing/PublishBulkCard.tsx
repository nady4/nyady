"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  publishMarketingPostAction,
  toggleMarketingPostStatusAction,
} from "@/actions/admin/marketing";

export interface BulkPublishGroup {
  campaign: string; // "" => sin campaña
  ready: { id: string; title: string }[];
  drafts: { id: string; title: string }[];
}

interface PublishBulkCardProps {
  groups: BulkPublishGroup[];
  metaReady: boolean;
}

const DELAY_BETWEEN_POSTS_MS = 4000;

/**
 * Sequential bulk publisher for the marketing drafts: one server action per
 * post with a pause in between (the IG API allows ~100 posts/24h rolling; a
 * batch of ≤25 stays far from it and avoids function-timeout trouble).
 */
export default function PublishBulkCard({
  groups,
  metaReady,
}: PublishBulkCardProps) {
  const router = useRouter();
  const nonEmpty = groups.filter((group) => group.ready.length + group.drafts.length > 0);
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(
    null
  );
  // Auto-selection: default to the first group with posts; after a mass
  // creation the fresh campaign is at the top and gets picked automatically
  // (state only pins a choice the user actually made).
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );
  const [results, setResults] = useState<string[]>([]);

  const selected = useMemo(
    () =>
      nonEmpty.find((group) => groupKey(group) === pickedKey) ?? nonEmpty[0] ?? null,
    [nonEmpty, pickedKey]
  );
  const campaignKey = selected ? groupKey(selected) : "";

  const targets = useMemo(() => {
    if (!selected) return [];
    const list = [...selected.ready];
    if (includeDrafts) list.push(...selected.drafts);
    return list;
  }, [selected, includeDrafts]);

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const publishAll = async () => {
    if (!selected || targets.length === 0 || busy) return;
    setBusy(true);
    setMessage(null);
    setResults([]);
    let ok = 0;
    let failed = 0;
    const lines: string[] = [];

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      setProgress({
        done: index,
        total: targets.length,
        current: target.title,
      });
      try {
        // Drafts get flipped to ready first (toggle is idempotent per state).
        if (includeDrafts && selected.drafts.some((d) => d.id === target.id)) {
          await toggleMarketingPostStatusAction(target.id);
        }
        const result = await publishMarketingPostAction(target.id);
        if (result.ok) {
          const channelSummaries = Object.entries(result.results ?? {})
            .map(([channel, outcome]) =>
              outcome.ok ? `${channel} ✓` : `${channel} ✗ ${outcome.error ?? ""}`.trim()
            )
            .filter(Boolean)
            .join(" · ");
          const allFailed =
            result.results &&
            Object.values(result.results).length > 0 &&
            Object.values(result.results).every((outcome) => !outcome.ok);
          if (allFailed) {
            failed += 1;
            lines.push(`✗ ${target.title} — ${result.results?.facebook?.error ?? result.results?.instagram?.error ?? "fallo"}`);
          } else {
            ok += 1;
            lines.push(`✓ ${target.title} — ${channelSummaries || "publicado"}`);
          }
        } else {
          failed += 1;
          lines.push(`✗ ${target.title} — ${result.error ?? "fallo"}`);
        }
      } catch {
        failed += 1;
        lines.push(`✗ ${target.title} — error de conexión`);
      }
      // Pause between POSTs to stay away from the rolling 24h-window burst.
      if (index < targets.length - 1) await delay(DELAY_BETWEEN_POSTS_MS);
    }

    setProgress(null);
    setResults(lines);
    setMessage({
      kind: failed > 0 && ok === 0 ? "error" : "ok",
      text: `Publicados: ${ok} · Fallidos: ${failed}.`
    });
    router.refresh();
  };

  if (groups.filter((g) => g.ready.length + g.drafts.length > 0).length === 0) {
    return (
      <div className="admin-card">
        <h3 className="admin-card-title">Publicar en masa</h3>
        <p className="admin-empty">
          No hay posts sin publicar (borradores o listos) con canal Facebook/Instagram.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-card admin-mkt-bulkpub">
      <h3 className="admin-card-title">Publicar en masa</h3>
      {message && (
        <p
          className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}
          role={message.kind === "ok" ? "status" : "alert"}
        >
          {message.text}
        </p>
      )}

      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Campaña</span>
          <select
            value={campaignKey}
            onChange={(e) => setPickedKey(e.target.value)}
          >
            {nonEmpty.map((group) => (
              <option key={groupKey(group)} value={groupKey(group)}>
                {campaignLabel(group)} — {group.ready.length} listo(s), {group.drafts.length} borrador(es)
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field admin-field-checkbox">
          <input
            type="checkbox"
            checked={includeDrafts}
            onChange={(e) => setIncludeDrafts(e.target.checked)}
          />
          <span>Incluir borradores (los borradores se marcan “listos” al publicar)</span>
        </label>
      </div>

      {selected && targets.length > 0 && (
        <div className="admin-mkt-bulkpub-list">
          {targets.map((target, index) => (
            <span key={target.id} className="admin-cell-sub">
              {index + 1}. {target.title}
            </span>
          ))}
        </div>
      )}

      {progress && (
        <p className="admin-field-hint" role="status">
          Publicando {progress.done + 1}/{progress.total}: {progress.current}…
        </p>
      )}

      <div className="admin-form-actions">
        <button
          type="button"
          className="admin-button primary"
          disabled={busy || targets.length === 0}
          onClick={() => void publishAll()}
        >
          {busy
            ? "Publicando…"
            : `Publicar ${targets.length} post(s) en secuencia`}
        </button>
        {!metaReady && (
          <span className="admin-error">Meta no está configurado en el entorno.</span>
        )}
        <p className="admin-field-hint" style={{ flexBasis: "100%" }}>
          Publicación secuencial con {DELAY_BETWEEN_POSTS_MS / 1000}s entre posts
          (límite IG ~100 posts/24h). Los posts Facebook publican la portada; los
          carousel van a Instagram.
        </p>
      </div>

      {results.length > 0 && (
        <div className="admin-mkt-bulkpub-results">
          {results.map((line, index) => (
            <p key={index} className={line.startsWith("✓") ? "admin-saved-hint" : "admin-error"}>
              {line}
            </p>
          ))}
        </div>
      )}

      <p className="admin-field-hint">
        ¿Falta crear más? <Link href="/admin/marketing/masa">Crear en masa (pantalla completa)</Link>.
      </p>
    </div>
  );
}

function groupKey(group: BulkPublishGroup): string {
  return group.campaign || "sin-campana";
}

function campaignLabel(group: BulkPublishGroup): string {
  return group.campaign || "Sin campaña";
}
