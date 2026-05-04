import { useState, useEffect } from "react";

interface UseValidateSettingsParams {
  currentPassword: string;
  newPassword: string;
  isFormValid: boolean;
  hasOtherChanges?: boolean;
}

interface UseValidateSettingsResult {
  isSubmitEnabled: boolean;
}

export const useValidateSettings = ({
  currentPassword,
  newPassword,
  isFormValid,
  hasOtherChanges = false,
}: UseValidateSettingsParams): UseValidateSettingsResult => {
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