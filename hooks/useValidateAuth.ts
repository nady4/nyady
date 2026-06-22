import { useMemo, useState } from "react";

interface FormValues {
  email: string;
  password: string;
  username?: string;
  confirmPassword?: string;
}

interface ValidationResult {
  isFormValid: boolean;
  error: string;
  validateForm: () => boolean;
}

export function useValidateAuth(formValues: FormValues): ValidationResult {
  const { email, password, username, confirmPassword } = formValues;
  // error is set by validateForm() on submit and cleared reactively when the
  // inputs that caused it change. Kept as state because it must persist across
  // renders between the submit action and the next input change.
  const [error, setError] = useState("");

  const isRegisterForm = useMemo(() => {
    return Boolean(username !== undefined || confirmPassword !== undefined);
  }, [username, confirmPassword]);

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

    formValid = formValid && isUsernameValid && doPasswordsMatch;
  }

  // Clear a stale "Passwords do not match" error once the passwords match
  // again, or any other stale error once the inputs change. This is a
  // best-effort reactive clear; the authoritative validation runs in
  // validateForm() on submit.
  if (error === "Passwords do not match") {
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
      setError("All fields are required");
      return false;
    }

    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }

    if (isRegisterForm) {
      if (!username) {
        setError("Username is required");
        return false;
      }

      if (username.trim().length < 3) {
        setError("Username must be at least 3 characters");
        return false;
      }

      if (!confirmPassword) {
        setError("Please confirm your password");
        return false;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
    }

    return true;
  };

  return { isFormValid: formValid, error, validateForm };
}
