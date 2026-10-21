import { useMemo, useState } from "react";

interface FormValues {
  email: string;
  password: string;
  username?: string;
  confirmPassword?: string;
  acceptTerms?: boolean;
}

interface ValidationResult {
  isFormValid: boolean;
  error: string;
  validateForm: () => boolean;
}

export function useValidateAuth(formValues: FormValues): ValidationResult {
  const { email, password, username, confirmPassword, acceptTerms } =
    formValues;
  // error is set by validateForm() on submit and cleared reactively when the
  // inputs that caused it change. Kept as state because it must persist across
  // renders between the submit action and the next input change.
  const [error, setError] = useState("");

  const isRegisterForm = useMemo(() => {
    return Boolean(
      username !== undefined ||
        confirmPassword !== undefined ||
        acceptTerms !== undefined
    );
  }, [username, confirmPassword, acceptTerms]);

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);

  const isEmailValid =
    email?.trim() !== "" && email ? emailRegex.test(email) : false;
  const isPasswordValid = password?.length >= 6;

  let formValid = isEmailValid && isPasswordValid;

  if (isRegisterForm) {
    const isUsernameValid =
      username?.trim() !== "" && username
        ? username.trim().length >= 3
        : false;

    const doPasswordsMatch =
      confirmPassword !== "" && password === confirmPassword;

    formValid =
      formValid && isUsernameValid && doPasswordsMatch && acceptTerms === true;
  }

  // Clear a stale "Las contraseñas no coinciden" error once the passwords
  // match again, or any other stale error once the inputs change. This is a
  // best-effort reactive clear; the authoritative validation runs in
  // validateForm() on submit.
  if (error === "Las contraseñas no coinciden") {
    const doPasswordsMatch =
      confirmPassword !== "" && password === confirmPassword;
    if (doPasswordsMatch) {
      setError("");
    }
  } else if (error) {
    // For non-mismatch errors (set on submit), clear them as soon as the
    // user edits any field, so the message doesn't linger.
    setError("");
  }

  const validateForm = (): boolean => {
    if (!email || !password) {
      setError("Completá todos los campos");
      return false;
    }

    if (!emailRegex.test(email)) {
      setError("Ingresá un email válido");
      return false;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }

    if (isRegisterForm) {
      if (!username) {
        setError("El nombre de usuario es obligatorio");
        return false;
      }

      if (username.trim().length < 3) {
        setError("El nombre de usuario debe tener al menos 3 caracteres");
        return false;
      }

      if (!confirmPassword) {
        setError("Confirmá tu contraseña");
        return false;
      }

      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden");
        return false;
      }

      if (!acceptTerms) {
        setError(
          "Tenés que aceptar los Términos y Condiciones y la Política de Privacidad"
        );
        return false;
      }
    }

    return true;
  };

  return { isFormValid: formValid, error, validateForm };
}
