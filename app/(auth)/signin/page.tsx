"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { useValidateAuth } from "@/hooks/useValidateAuth";
import "@/styles/Auth.scss";

function SignInForm() {
  const { register, handleSubmit, watch, getValues } = useForm();

  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null | undefined>(
    null
  );
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  const email = watch("email") || "";
  const password = watch("password") || "";

  const { isFormValid, error } = useValidateAuth({ email, password });

  const justVerified = searchParams.get("verified") === "1";
  const justRegistered = searchParams.get("registered") === "1";
  const verificationFailed = searchParams.has("verification_error");

  const onResend = async () => {
    const emailValue = getValues("email");
    if (!emailValue) {
      setServerError("Escribí tu email para reenviar la confirmación.");
      return;
    }

    setResendState("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue })
      });
      setResendState(res.ok ? "sent" : "error");
    } catch {
      setResendState("error");
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    setNeedsVerification(false);
    setResendState("idle");

    const res = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password
    });

    if (res?.ok) {
      router.push("/catalog");
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
  });

  return (
    <div className="auth-form">
      <h1 className="form-title">Iniciar sesión</h1>
      <form onSubmit={onSubmit}>
        {justVerified && (
          <p className="success">
            ¡Listo! Tu email fue confirmado. Ya podés iniciar sesión.
          </p>
        )}
        {justRegistered && !justVerified && (
          <p className="success">
            Creamos tu cuenta. Te enviamos un email para confirmarla: revisá tu
            bandeja de entrada (y el spam) antes de iniciar sesión.
          </p>
        )}
        {verificationFailed && (
          <p className="error">
            El enlace de confirmación no es válido o ya venció. Iniciá sesión
            con tu email y contraseña y te ofreceremos reenviar uno nuevo.
          </p>
        )}
        <input
          type="email"
          placeholder="Email"
          {...register("email", { required: true })}
        />
        <input
          type="password"
          placeholder="Contraseña"
          {...register("password", { required: true })}
        />
        {(error || serverError) && (
          <p className="error">{error || serverError}</p>
        )}
        {needsVerification && (
          <div className="resend">
            {resendState === "sent" ? (
              <p className="success">
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
                  <p className="error">
                    No pudimos reenviarlo. Intentá de nuevo más tarde.
                  </p>
                )}
              </>
            )}
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
          Iniciar sesión
        </button>
      </form>
      <Link href="/register" className="link">
        Registrarse
      </Link>
    </div>
  );
}

function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

export default SignInPage;
