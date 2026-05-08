"use client";
import { useState, useTransition } from "react";
import { useSession, signOut } from "next-auth/react";
import { useValidateAuth } from "@/hooks/useValidateAuth";
import { updateUser } from "@/actions/user";
import FormContainer from "@/components/FormContainer";

export default function CuentaPage() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState(session?.user?.email || "");
  const [username, setUsername] = useState(session?.user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasChanges = email !== (session?.user?.email || "") || username !== (session?.user?.username || "");

  const { error, validateForm } = useValidateAuth({
    email,
    username,
    password: newPassword,
    confirmPassword: newPassword
  });

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setServerError(null);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setServerError(null);
  };

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
    setServerError(null);
  };

  const handleCurrentPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPassword(e.target.value);
    setServerError(null);
  };

  const handleSubmit = (formData: FormData) => {
    if (newPassword && !validateForm()) return;
    startTransition(async () => {
      try {
        await updateUser(formData);
        window.location.href = "/catalog";
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Error desconocido";
        if (errorMsg.toLowerCase().includes("password") || errorMsg.toLowerCase().includes("invalid")) {
          setServerError("Contraseña incorrecta");
        } else {
          setServerError(errorMsg);
        }
      }
    });
  };

  const canSubmit = currentPassword && (hasChanges || newPassword);

  if (status === "loading")
    return (
      <FormContainer title="Mi Cuenta">
        <p className="loading">Cargando información...</p>
      </FormContainer>
    );

  return (
    <div className="form-page">
      <FormContainer title="Mi Cuenta">
        <form action={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder={session?.user?.email || "Email"}
            value={email}
            onChange={handleEmailChange}
          />
          <input
            type="text"
            name="username"
            placeholder={session?.user?.username || "Nombre de usuario"}
            value={username}
            onChange={handleUsernameChange}
          />
          <input
            type="password"
            name="newPassword"
            placeholder="Nueva Contraseña (opcional)"
            value={newPassword}
            onChange={handleNewPasswordChange}
          />
          <input
            type="password"
            name="currentPassword"
            placeholder="Contraseña Actual"
            value={currentPassword}
            onChange={handleCurrentPasswordChange}
            required
          />
          {(error || serverError) && <p className="error">{error || serverError}</p>}
          <button type="submit" disabled={!canSubmit || pending}>
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