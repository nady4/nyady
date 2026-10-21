"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import "@/styles/Auth.scss";

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const missingToken = !token;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      setError(
        `La contraseña necesita entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres`
      );
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "No se pudo cambiar la contraseña.");
      }
    } catch {
      setError("Error de conexión. Intentá más tarde.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="auth-form">
      <h1 className="form-title">Nueva contraseña</h1>
      <form onSubmit={handleSubmit}>
        {missingToken && (
          <>
            <p className="error">
              El enlace no incluye el token de recuperación. Pedí uno nuevo.
            </p>
            <Link href="/forgot-password" className="link">
              Ir a ¿Olvidaste tu contraseña?
            </Link>
          </>
        )}

        {!missingToken && done && (
          <>
            <p className="success">
              ¡Listo! Tu contraseña quedó actualizada. Ya podés iniciar sesión
              con la nueva.
            </p>
            <Link href="/signin" className="link">
              Volver a iniciar sesión
            </Link>
          </>
        )}

        {!missingToken && !done && (
          <>
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
              autoComplete="new-password"
              required
            />
            <input
              type="password"
              placeholder="Confirmar nueva contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
