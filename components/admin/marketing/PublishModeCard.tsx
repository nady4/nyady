"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAutoPublishAction } from "@/actions/admin/marketing";

/**
 * Publication mode (phase 5b).
 *
 * Unattended publishing is OFF by default: the Vercel cron and the GitHub
 * Actions workflow only *prepare* the queue, they never publish. This card
 * is the single place where that switch lives.
 */
export default function PublishModeCard({
  autoPublish,
}: {
  autoPublish: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );

  const toggle = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const result = await setAutoPublishAction(!autoPublish);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error ?? "No se pudo cambiar" });
        return;
      }
      setMessage({
        kind: "ok",
        text: autoPublish
          ? "Publicación automática desactivada: la cola programada ya no publica nada."
          : "Publicación automática activada: la cola programada publicará los posts aprobados.",
      });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Error de conexión. Reintentá." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-card admin-mkt-publishmode">
      <div className="admin-mkt-stats-head">
        <div>
          <h3 className="admin-card-title">
            Publicación automática:{" "}
            {autoPublish ? "ACTIVADA" : "DESACTIVADA"}
          </h3>
          <p className="admin-field-hint">
            {autoPublish
              ? "Los posts aprobados se publican solos en su horario (cron de Vercel / workflow de GitHub)."
              : "Nada se publica solo: ni el cron de Vercel ni el workflow de GitHub publican. Vos publicás con “Publicar” o “Correr cola”."}
          </p>
        </div>
        <button
          type="button"
          className={`admin-button ${autoPublish ? "danger" : "primary"}`}
          disabled={busy}
          onClick={() => void toggle()}
        >
          {busy
            ? "Guardando…"
            : autoPublish
              ? "Desactivar publicación automática"
              : "Activar publicación automática"}
        </button>
      </div>
      {message && (
        <p
          className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}
          role="status"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
