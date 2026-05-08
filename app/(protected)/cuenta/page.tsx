"use client";
import { useState, useTransition } from "react";
import { useSession, signOut } from "next-auth/react";
import { useValidateAuth } from "@/hooks/useValidateAuth";
import { useValidateCuenta } from "@/hooks/useValidateCuenta";
import { updateUser } from "@/actions/user";
import FormContainer from "@/components/FormContainer";

export default function CuentaPage() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState(session?.user?.email || "");
  const [username, setUsername] = useState(session?.user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pending, startTransition] = useTransition();

  const hasOtherChanges = session?.user?.email !== email || session?.user?.username !== username;

  const { isFormValid, error, validateForm } = useValidateAuth({
    email,
    username,
    password: newPassword,
    confirmPassword: newPassword
  });

  const { isSubmitEnabled } = useValidateCuenta({
    currentPassword,
    newPassword,
    isFormValid,
    hasOtherChanges
  });

  const handleSubmit = (formData: FormData) => {
    if (newPassword && !validateForm()) return;
    startTransition(async () => {
      try {
        await updateUser(formData);
        window.location.href = "/catalog";
      } catch (err) {
        console.error(err);
      }
    });
  };

  if (status === "loading")
    return (
      <FormContainer title="Configuración de la cuenta">
        <p className="loading">Cargando información...</p>
      </FormContainer>
    );

  return (
    <div className="form-page">
      <FormContainer title="Configuración de la cuenta">
        <form action={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Nuevo Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="text"
            name="username"
            placeholder="Nuevo Nombre de Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            name="newPassword"
            placeholder="Nueva Contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            type="password"
            name="currentPassword"
            placeholder="Contraseña Actual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={!isSubmitEnabled || pending}>
            {pending ? "Guardando..." : "Guardar Cambios"}
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Cerrar Sesión
          </button>
        </form>
      </FormContainer>
    </div>
  );
}