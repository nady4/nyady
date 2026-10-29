import { useMemo, useState, useEffect } from "react";

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

/** Shared minimum: register, reset and the API agree on 8 (bcrypt max 72). */
export const PASSWORD_MIN_LENGTH = 8;

export function useValidateAuth(formValues: FormValues): ValidationResult {
  const { email, password, username, confirmPassword, acceptTerms } =
    formValues;
  // error is set by validateForm() on submit and cleared reactively when the
  // inputs that caused it change.
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
  const isPasswordValid = (password?.length ?? 0) >= PASSWORD_MIN_LENGTH;

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

  // Clear stale submit errors as soon as any input changes.
  useEffect(() => {
    queueMicrotask(() => setError(""));
  }, [email, password, username, confirmPassword, acceptTerms]);

  const validateForm = (): boolean => {
    if (!email || !password) {
      setError("Completá todos los campos");
      return false;
    }

    if (!emailRegex.test(email)) {
      setError("Ingresá un email válido");
      return false;
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(
        `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`
      );
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
