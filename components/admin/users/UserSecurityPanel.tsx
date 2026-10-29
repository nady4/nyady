"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  archiveUserAction,
  deleteUserPermanentlyAction,
  resetUserPasswordAction,
  resendUserVerificationAction,
  restoreUserAction,
  setUserVerifiedAction,
} from "@/actions/admin/users";
import type { AdminActionResult, AdminUserDetailView } from "@/types/admin";

/**
 * Account actions on the user detail page: verification toggle, confirmation
 * email resend, password reset and archive/restore.
 */
export default function UserSecurityPanel({ user }: { user: AdminUserDetailView }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const run = async (action: () => Promise<AdminActionResult>) => {
    setMessage(null);
    setBusy(true);
    try {
      const result = await action();
      if (result.ok) {
        setMessage({ kind: "ok", text: "Listo" });
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

  if (user.archivedAt) {
    return (
      <div className="admin-user-security">
        <div className="admin-user-security-row">
          <span>Cuenta archivada: sin acceso a la tienda.</span>
          <button
            type="button"
            className="admin-button small"
            disabled={busy}
            onClick={() => void run(() => restoreUserAction(user.id))}
          >
            {busy ? "Procesando..." : "Restaurar"}
          </button>
        </div>
        {message && (
          <p className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"} role={message.kind === "ok" ? "status" : "alert"}>
            {message.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="admin-user-security">
      <div className="admin-user-security-row">
        <span>
          Verificación:{" "}
          <strong>
            {user.emailVerified ? "verificada" : "sin verificar"}
          </strong>
        </span>
        <div className="admin-user-security-actions">
          {user.emailVerified ? (
            <button
              type="button"
              className="admin-button small"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "¿Marcar como NO verificada? El usuario no podrá iniciar sesión hasta confirmar su email."
                  )
                ) {
                  void run(() => setUserVerifiedAction(user.id, false));
                }
              }}
            >
              Marcar sin verificar
            </button>
          ) : (
            <>
              <button
                type="button"
                className="admin-button small"
                disabled={busy}
                onClick={() => void run(() => resendUserVerificationAction(user.id))}
              >
                Reenviar confirmación
              </button>
              <button
                type="button"
                className="admin-button small"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "¿Marcar como verificada manualmente? Usalo solo si el usuario confirmó por otro canal."
                    )
                  ) {
                    void run(() => setUserVerifiedAction(user.id, true));
                  }
                }}
              >
                Marcar verificada
              </button>
            </>
          )}
        </div>
      </div>

      <div className="admin-user-security-row">
        <label htmlFor="admin-user-new-password">Nueva contraseña</label>
        <div className="admin-user-security-actions">
          <input
            id="admin-user-new-password"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
          <button
            type="button"
            className="admin-button small"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
          >
            {showPassword ? "Ocultar" : "Ver"}
          </button>
          <button
            type="button"
            className="admin-button small primary"
            disabled={busy || newPassword.length < 8}
            onClick={() => {
              if (
                window.confirm(
                  "¿Cambiar la contraseña? No se avisa al usuario: pasale la nueva por tu canal."
                )
              ) {
                void run(() => resetUserPasswordAction(user.id, newPassword));
                setNewPassword("");
              }
            }}
          >
            Cambiar
          </button>
        </div>
      </div>

      <div className="admin-user-security-row">
        <span>Zona riesgosa</span>
        <div className="admin-user-security-actions">
          <button
            type="button"
            className="admin-button small danger"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  `¿Archivar a "${user.username}"?\nYa no podrá iniciar sesión; sus carritos y favoritos se borran, pero su historial de pedidos se conserva.`
                )
              ) {
                void run(() => archiveUserAction(user.id));
              }
            }}
          >
            Archivar cuenta
          </button>
          <button
            type="button"
            className={`admin-button small ${user.counts.orders > 0 ? "" : "danger"}`}
            disabled={busy || user.counts.orders > 0}
            title={
              user.counts.orders > 0
                ? "Tiene pedidos: archivalo para conservar el historial"
                : "Eliminar definitivamente"
            }
            onClick={() => {
              if (
                window.confirm(
                  `¿ELIMINAR definitivamente a "${user.username}"?\nSe borran su dirección, tokens y la cuenta. Esta acción no se deshace.`
                )
              ) {
                void run(() => deleteUserPermanentlyAction(user.id));
              }
            }}
          >
            {user.counts.orders > 0 ? "Eliminar (bloqueado)" : "Eliminar"}
          </button>
        </div>
      </div>

      {message && (
        <p className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"} role={message.kind === "ok" ? "status" : "alert"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
