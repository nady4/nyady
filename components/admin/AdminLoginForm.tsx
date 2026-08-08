"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fraunces } from "@/app/fonts";
import "@/styles/Admin.scss";

export default function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");

    if (!username || !password) {
      setError("Completá usuario y contraseña");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Usuario o contraseña incorrectos");
        setPending(false);
      }
    } catch {
      setError("Error al iniciar sesión. Intentalo más tarde.");
      setPending(false);
    }
  };

  return (
    <div className="admin-login">
      <h1 className={`admin-login-title ${fraunces.className}`}>
        Acceso administrador
      </h1>
      <form onSubmit={handleSubmit} className="admin-login-form">
        <input
          type="text"
          name="username"
          placeholder="Usuario"
          autoComplete="username"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          autoComplete="current-password"
          required
        />
        {error && <p className="admin-error">{error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
