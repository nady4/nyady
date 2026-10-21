"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useValidateAuth } from "@/hooks/useValidateAuth";
import "@/styles/Auth.scss";

const RESEND_COOLDOWN_SECONDS = 60;

function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const { isFormValid, error, validateForm } = useValidateAuth({
    email,
    username,
    password,
    confirmPassword,
    acceptTerms
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setUnverifiedEmail(null);
    setResendState("idle");
    setCooldown(0);
    if (!validateForm()) return;

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, username, password, acceptTerms, marketingOptIn })
      });

      if (res.ok) {
        router.push("/signin?registered=1");
      } else {
        const data = await res.json();
        if (data.code === "EMAIL_EXISTS_UNVERIFIED") {
          setUnverifiedEmail(email);
        }
        setServerError(data.error || "Registro fallido");
      }
    } catch {
      setServerError("Error al registrarse. Intentá de nuevo más tarde.");
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail || resendState === "sending" || cooldown > 0) return;

    setResendState("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail })
      });

      if (res.ok) {
        setResendState("sent");
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setResendState("error");
      }
    } catch {
      setResendState("error");
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    // The pending-confirmation state belongs to the previous email.
    if (unverifiedEmail && value !== unverifiedEmail) {
      setUnverifiedEmail(null);
      setResendState("idle");
      setCooldown(0);
    }
  };

  return (
    <div className="auth-form">
      <h2 className="title">Creá tu cuenta</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => handleEmailChange(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <label className="terms-check">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
          />
          <span>
            Acepto los{" "}
            <Link href="/info/terminos" target="_blank" rel="noopener noreferrer">
              Términos y Condiciones
            </Link>{" "}
            y la{" "}
            <Link
              href="/info/privacidad"
              target="_blank"
              rel="noopener noreferrer"
            >
              Política de Privacidad
            </Link>
          </span>
        </label>
        <label className="terms-check">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
          />
          <span>
            Quiero recibir <strong>emails promocionales</strong> de NYADY
            (novedades y descuentos)
          </span>
        </label>
        {(error || serverError) && (
          <p className="error">{error || serverError}</p>
        )}
        {unverifiedEmail && (
          <div className="resend">
            {resendState === "sent" && (
              <p className="success">
                Listo, te reenviamos el email de confirmación a{" "}
                {unverifiedEmail}.
              </p>
            )}
            {resendState === "error" && (
              <p className="error">
                No pudimos reenviarlo. Intentá de nuevo más tarde.
              </p>
            )}
            <button
              type="button"
              className="resend-btn"
              onClick={handleResend}
              disabled={resendState === "sending" || cooldown > 0}
            >
              {resendState === "sending"
                ? "Reenviando..."
                : cooldown > 0
                  ? `Reenviar en ${cooldown}s`
                  : resendState === "error"
                    ? "Reintentar envío"
                    : "Reenviar email de confirmación"}
            </button>
          </div>
        )}
        <button
          type="submit"
          disabled={!isFormValid}
          style={{
            opacity: isFormValid ? 1 : 0.5,
            cursor: isFormValid ? "pointer" : "not-allowed"
          }}
        >
          Registrarse
        </button>
      </form>
      <Link href="/signin" className="link">
        Iniciar sesión
      </Link>
    </div>
  );
}

export default RegisterPage;
