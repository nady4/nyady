"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserAction,
  updateUserAction,
  updateUserAddressAction,
} from "@/actions/admin/users";
import type { AdminUserDetailView } from "@/types/admin";

/**
 * Profile form reused by create and edit pages. On edit it also shows the
 * shipping-address editor (create embeds address fields inline).
 */
export default function UserFormAdmin({
  user,
}: {
  user?: AdminUserDetailView;
}) {
  const router = useRouter();
  const editing = Boolean(user?.id);

  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [street, setStreet] = useState(user?.address?.street ?? "");
  const [city, setCity] = useState(user?.address?.city ?? "");
  const [state, setState] = useState(user?.address?.state ?? "");
  const [postalCode, setPostalCode] = useState(user?.address?.postalCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (editing) {
      setBusy(true);
      try {
        const result = await updateUserAction(user!.id, { username, email });
        if (!result.ok) {
          setError(result.error ?? "No se pudo actualizar");
          setBusy(false);
          return;
        }
        // Address editor is independent on edit.
        if (street.trim() || user?.address) {
          const addressResult = await updateUserAddressAction(user!.id, {
            street,
            city: city.trim() || user?.address?.city || "",
            state: state.trim() || user?.address?.state || "",
            postalCode: postalCode.trim() || user?.address?.postalCode || "",
          });
          if (!addressResult.ok) {
            setError(addressResult.error ?? "No se pudo guardar la dirección");
            setBusy(false);
            return;
          }
        }
        router.refresh();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch {
        setError("Error de conexión. Reintentá.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setBusy(true);
    try {
      const result = await createUserAction({
        username,
        email,
        password,
        verified: false,
        street: street.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        postalCode: postalCode.trim() || null,
      });
      if (!result.ok || !result.userId) {
        setError(result.error ?? "No se pudo crear el usuario");
        setBusy(false);
        return;
      }
      router.push(`/admin/usuarios/${result.userId}`);
      router.refresh();
    } catch {
      setError("Error de conexión. Reintentá.");
      setBusy(false);
    }
  };

  return (
    <form className="admin-product-form" onSubmit={handleSubmit}>
      <div className="admin-form-section">
        <h2 className="admin-form-section-title">Cuenta</h2>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Nombre de usuario</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={40}
              required
            />
          </label>

          <label className="admin-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          {!editing && (
            <>
              <label className="admin-field">
                <span>Contraseña</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </label>
              <label className="admin-field">
                <span>Confirmar contraseña</span>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>
            </>
          )}
        </div>
        {editing && (
          <p className="admin-field-hint">
            Cambiar el email desverifica la cuenta: el nuevo correo se
            confirma con el link o desde «Marcar verificada».
          </p>
        )}
      </div>

      <div className="admin-form-section">
        <h2 className="admin-form-section-title">Dirección de envío</h2>
        <div className="admin-form-grid">
          <label className="admin-field admin-field-wide">
            <span>Calle y número</span>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Av. Corrientes 1234"
            />
          </label>
          <label className="admin-field">
            <span>Ciudad</span>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Buenos Aires"
            />
          </label>
          <label className="admin-field">
            <span>Provincia</span>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="CABA"
            />
          </label>
          <label className="admin-field">
            <span>Código postal</span>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="C1043"
            />
          </label>
        </div>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}

      <div className="admin-form-actions">
        {saved && <span className="admin-saved-hint" role="status">Guardado</span>}
        <button type="submit" className="admin-button primary" disabled={busy}>
          {busy
            ? "Guardando..."
            : editing
              ? "Guardar cambios"
              : "Crear usuario"}
        </button>
        <button
          type="button"
          className="admin-button"
          onClick={() => router.back()}
          disabled={busy}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
