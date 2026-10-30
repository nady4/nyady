"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  disconnectMetaAction,
  runPublishQueueAction,
} from "@/actions/admin/marketing";
import type { AdminActionResult, MetaConnectionState } from "@/types/admin";

interface SocialConnectionsCardProps {
  connection: MetaConnectionState;
}

/**
 * Looks rows ([ok|warning]) are styled by the caller so the card only renders
 * basic text: connected accounts, connect/disconnect buttons, queue runner.
 */
export default function SocialConnectionsCard({
  connection,
}: SocialConnectionsCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );

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
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ kind: "error", text: result.error ?? "No se pudo completar" });
      }
    } catch {
      setMessage({ kind: "error", text: "Error de conexión. Reintentá." });
    } finally {
      setBusy(false);
    }
  };

  const runQueue = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const result = await runPublishQueueAction();
      if (result.ok) {
        const attempted = result.attempted ?? 0;
        const failures = result.failures ?? [];
        setMessage({
          kind: failures.length > 0 ? "error" : "ok",
          text:
            attempted === 0
              ? "No había posts programados pendientes."
              : `Publicados: ${result.published ?? 0}${failures.length > 0 ? ` · fallas: ${failures[0]}` : ""}`,
        });
        router.refresh();
        setTimeout(() => setMessage(null), 6000);
      } else {
        setMessage({
          kind: "error",
          text: result.error ?? "No se pudo correr la cola",
        });
      }
    } catch {
      setMessage({ kind: "error", text: "Error de conexión. Reintentá." });
    } finally {
      setBusy(false);
    }
  };

  const connected = connection.facebook.connected || connection.instagram.connected;

  return (
    <div className="admin-card admin-mkt-meta">
      <h3 className="admin-card-title">Conexión con Meta</h3>
      {message && (
        <p
          className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}
          role={message.kind === "ok" ? "status" : "alert"}
        >
          {message.text}
        </p>
      )}

      {!connection.configured && (
        <p className="admin-error" role="alert">
          Faltan <code>META_APP_ID</code> y <code>META_APP_SECRET</code> en el entorno para
          conectar tus cuentas.
        </p>
      )}

      <div className="admin-mkt-meta-rows">
        <div className="admin-mkt-meta-row">
          <span className="admin-mkt-channel is-facebook">Facebook</span>
          {connection.facebook.connected ? (
            <>
              <span className="admin-cell-sub">
                Página: {connection.facebook.pageName ?? "conectada"}
              </span>
              <button
                type="button"
                className="admin-button small danger"
                disabled={busy}
                onClick={() => void run(() => disconnectMetaAction("facebook"), "Desconectado")}
              >
                Desconectar
              </button>
            </>
          ) : (
            <a
              className="admin-button small"
              href="/api/admin/marketing/meta/connect"
              aria-disabled={busy}
            >
              Conectar Página
            </a>
          )}
        </div>

        <div className="admin-mkt-meta-row">
          <span className="admin-mkt-channel is-instagram">Instagram</span>
          {connection.instagram.connected ? (
            <>
              <span className="admin-cell-sub">
                @{connection.instagram.username ?? "conectada"}
              </span>
              <button
                type="button"
                className="admin-button small danger"
                disabled={busy}
                onClick={() => void run(() => disconnectMetaAction("instagram"), "Desconectado")}
              >
                Desconectar
              </button>
            </>
          ) : (
            <>
              <a
                className="admin-button small"
                href="/api/admin/marketing/meta/connect"
                aria-disabled={busy}
                title="Se conecta junto a la Página (necesita la IG profesional vinculada)"
              >
                Conectar Instagram
              </a>
              {connection.facebook.connected && (
                <p className="admin-field-hint" style={{ flexBasis: "100%" }}>
                  Es una sola conexión: en el selector de activos tildá la Página
                  <strong>{` ${connection.facebook.pageName} `}</strong>y el
                  Instagram juntos. Si no aparece el Instagram, vinculá
                  `@tu_cuenta_de_IG` a la Página en el Accounts Center y reconectá.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {connected && (
        <div className="admin-mkt-meta-queue">
          <button
            type="button"
            className="admin-button small primary"
            disabled={busy}
            onClick={() => void runQueue()}
          >
            Correr cola ahora
          </button>
          <p className="admin-field-hint">
            El cron de Vercel corre la cola una vez por día con <code>CRON_SECRET</code>. Con
            este botón podés dispararla cuando quieras.
          </p>
        </div>
      )}

      {!connected && connection.configured && (
        <p className="admin-field-hint">
          Tocá “Conectar” y autorizá con la cuenta admin de la Página (la app de Meta puede
          seguir en modo desarrollo para publicarte a vos).
        </p>
      )}
    </div>
  );
}
