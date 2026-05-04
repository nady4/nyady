import { useState, useEffect, useMemo } from "react";

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
  const [isFormValid, setIsFormValid] = useState(false);
  const [error, setError] = useState("");

  const isRegisterForm = useMemo(() => {
    return Boolean(username !== undefined || confirmPassword !== undefined);
  }, [username, confirmPassword]);

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);

  useEffect(() => {
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

      if (error === "Passwords do not match" && doPasswordsMatch) {
        setError("");
      } else if (confirmPassword && password !== confirmPassword) {
        setError("Passwords do not match");
      } else if (error && error !== "Passwords do not match") {
        setError("");
      }

      formValid = formValid && isUsernameValid && doPasswordsMatch;
    } else {
      if (error) {
        setError("");
      }
    }

    setIsFormValid(formValid);
  }, [
    email,
    password,
    username,
    confirmPassword,
    error,
    emailRegex,
    isRegisterForm,
  ]);

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

  return { isFormValid, error, validateForm };
}