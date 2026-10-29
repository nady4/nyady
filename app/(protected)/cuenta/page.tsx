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
  const [saved, setSaved] = useState(false);
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
        setServerError(null);
        setSaved(true);
      } catch (err) {
        setSaved(false);
        const errorMsg = err instanceof Error ? err.message : "Error desconocido";
        if (errorMsg.toLowerCase().includes("password") || errorMsg.toLowerCase().includes("invalid")) {
          setServerError("La contraseña actual es incorrecta");
        } else if (errorMsg.includes("Unique constraint") || errorMsg.includes("P2002")) {
          setServerError("Ese email ya está registrado en otra cuenta");
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
        <p className="loading" role="status">
          Cargando información...
        </p>
      </FormContainer>
    );

  return (
    <div className="form-page">
      <FormContainer title="Mi Cuenta">
        <form action={handleSubmit}>
          <label htmlFor="cuenta-email" className="sr-only">
            Email
          </label>
          <input
            id="cuenta-email"
            type="email"
            name="email"
            placeholder={session?.user?.email || "Email"}
            value={email}
            onChange={handleEmailChange}
            autoComplete="email"
          />
          <label htmlFor="cuenta-username" className="sr-only">
            Nombre de usuario
          </label>
          <input
            id="cuenta-username"
            type="text"
            name="username"
            placeholder={session?.user?.username || "Nombre de usuario"}
            value={username}
            onChange={handleUsernameChange}
            autoComplete="username"
          />
          <label htmlFor="cuenta-new-password" className="sr-only">
            Nueva contraseña (opcional, mínimo 8 caracteres)
          </label>
          <input
            id="cuenta-new-password"
            type="password"
            name="newPassword"
            placeholder="Nueva Contraseña (opcional)"
            value={newPassword}
            onChange={handleNewPasswordChange}
            autoComplete="new-password"
            minLength={8}
          />
          <label htmlFor="cuenta-current-password" className="sr-only">
            Contraseña actual
          </label>
          <input
            id="cuenta-current-password"
            type="password"
            name="currentPassword"
            placeholder="Contraseña Actual"
            value={currentPassword}
            onChange={handleCurrentPasswordChange}
            autoComplete="current-password"
            required
          />
          {saved && (
            <p className="success" role="status">
              Guardado: tus cambios quedaron aplicados.
            </p>
          )}
          {(error || serverError) && (
            <p className="error" role="alert">
              {error || serverError}
            </p>
          )}
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
