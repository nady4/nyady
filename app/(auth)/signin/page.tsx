"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useValidateAuth } from "@/hooks/useValidateAuth";
import "@/styles/Auth.scss";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  const { isFormValid, error: validationError, validateForm } = useValidateAuth({
    email,
    password
  });

  const justVerified = searchParams.get("verified") === "1";
  const justRegistered = searchParams.get("registered") === "1";
  const verificationFailed = searchParams.has("verification_error");

  // Where to land after sign-in: the comprar-flow sends a callbackUrl so the
  // user returns to the product/cart that interrupted them (never to a bare
  // /catalog that forgets the intent).
  const callbackUrl = searchParams.get("callbackUrl");
  const safeCallbackUrl =
    callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/catalog";

  const onResend = async () => {
    if (!email.trim()) {
      setServerError("Escribí tu email para reenviar la confirmación.");
      return;
    }

    setResendState("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      setResendState(res.ok ? "sent" : "error");
    } catch {
      setResendState("error");
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);
    setNeedsVerification(false);
    setResendState("idle");
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password
      });

      if (res?.ok) {
        router.push(safeCallbackUrl);
        router.refresh();
      } else {
        const errorMsg = res?.error || "";
        const lower = errorMsg.toLowerCase();
        if (errorMsg === "EMAIL_NOT_VERIFIED") {
          setNeedsVerification(true);
          setServerError(
            "Tu email todavía no está confirmado. Revisá tu bandeja de entrada (y el spam)."
          );
        } else if (lower.includes("credentials") || lower.includes("signin")) {
          setServerError("Email o contraseña incorrectos");
        } else if (lower.includes("user")) {
          setServerError("Usuario no encontrado");
        } else {
          setServerError("Error al iniciar sesión. Intentalo más tarde.");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-form">
      <h1 className="form-title">Iniciar sesión</h1>
      <form onSubmit={onSubmit}>
        {justVerified && (
          <p className="success" role="status">
            ¡Listo! Tu email fue confirmado. Ya podés iniciar sesión.
          </p>
        )}
        {justRegistered && !justVerified && (
          <p className="success" role="status">
            Creamos tu cuenta. Te enviamos un email para confirmarla: revisá tu
            bandeja de entrada (y el spam) antes de iniciar sesión.
          </p>
        )}
        {verificationFailed && (
          <p className="error" role="alert">
            El enlace de confirmación no es válido o ya venció. Iniciá sesión
            con tu email y contraseña y te ofreceremos reenviar uno nuevo.
          </p>
        )}
        <label htmlFor="signin-email" className="sr-only">
          Email
        </label>
        <input
          id="signin-email"
          type="email"
          name="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="signin-password" className="sr-only">
          Contraseña
        </label>
        <input
          id="signin-password"
          type="password"
          name="password"
          placeholder="Contraseña"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {(validationError || serverError) && (
          <p className="error" role="alert">
            {validationError || serverError}
          </p>
        )}
        {needsVerification && (
          <div className="resend">
            {resendState === "sent" ? (
              <p className="success" role="status">
                Listo, te reenviamos el email de confirmación.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  className="resend-btn"
                  onClick={onResend}
                  disabled={resendState === "sending"}
                >
                  {resendState === "sending"
                    ? "Reenviando..."
                    : "Reenviar email de confirmación"}
                </button>
                {resendState === "error" && (
                  <p className="error" role="alert">
                    No pudimos reenviarlo. Intentá de nuevo más tarde.
                  </p>
                )}
              </>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={!isFormValid || submitting}
          style={{
            opacity: isFormValid ? 1 : 0.5,
            cursor: isFormValid ? "pointer" : "not-allowed"
          }}
        >
          {submitting ? "Iniciando sesión..." : "Iniciar sesión"}
        </button>
      </form>
      <Link href="/forgot-password" className="link">
        ¿Olvidaste tu contraseña?
      </Link>
      <Link href="/register" className="link">
        Registrarse
      </Link>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
