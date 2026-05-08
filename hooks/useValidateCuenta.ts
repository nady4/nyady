import { useState, useEffect } from "react";

interface UseValidateCuentaParams {
  currentPassword: string;
  newPassword: string;
  isFormValid: boolean;
  hasOtherChanges?: boolean;
}

interface UseValidateCuentaResult {
  isSubmitEnabled: boolean;
}

export const useValidateCuenta = ({
  currentPassword,
  newPassword,
  isFormValid,
  hasOtherChanges = false,
}: UseValidateCuentaParams): UseValidateCuentaResult => {
  const [isSubmitEnabled, setIsSubmitEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (!currentPassword) {
      setIsSubmitEnabled(false);
      return;
    }

    if (newPassword) {
      setIsSubmitEnabled(isFormValid);
      return;
    }

    if (hasOtherChanges) {
      setIsSubmitEnabled(true);
      return;
    }

    setIsSubmitEnabled(false);
  }, [currentPassword, newPassword, isFormValid, hasOtherChanges]);

  return { isSubmitEnabled };
};