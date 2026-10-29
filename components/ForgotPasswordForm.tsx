"use client";

import Link from "next/link";
import { useState } from "react";
import "@/styles/Auth.scss";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Ingresá tu email");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      // The endpoint answers the same message whether the account exists or
      // not — treat any 2xx as sent.
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "No se pudo enviar el email. Intentá más tarde.");
      }
    } catch {
      setError("Error de conexión. Intentá más tarde.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="auth-form">
      <h1 className="form-title">¿Olvidaste tu contraseña?</h1>
      <form onSubmit={handleSubmit}>
        {sent ? (
          <>
            <p className="success" role="status">
              Si la cuenta existe, te enviamos un email con el enlace para
              elegir una contraseña nueva. El enlace vence en 1 hora.
            </p>
            <Link href="/signin" className="link">
              Volver a iniciar sesión
            </Link>
          </>
        ) : (
          <>
            <p className="auth-hint">
              Escribí el email de tu cuenta y te mandamos un enlace para crear
              una contraseña nueva.
            </p>
            <label htmlFor="forgot-email" className="sr-only">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            {error && <p className="error" role="alert">{error}</p>}
            <button type="submit" disabled={pending}>
              {pending ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
