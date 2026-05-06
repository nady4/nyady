"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useValidateAuth } from "@/hooks/useValidateAuth";
import "@/styles/Auth.scss";

function SignInPage() {
  const { register, handleSubmit, watch } = useForm();

  const router = useRouter();
  const [serverError, setServerError] = useState<string | null | undefined>(
    null
  );

  const email = watch("email") || "";
  const password = watch("password") || "";

  const { isFormValid, error } = useValidateAuth({ email, password });

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);

    const res = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password
    });

    if (res?.ok) {
      router.push("/");
      router.refresh();
    } else {
      setServerError(res?.error);
    }
  });

  return (
    <div className="auth-form">
      <form onSubmit={onSubmit}>
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

export default SignInPage;
