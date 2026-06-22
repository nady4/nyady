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
  // Derived (not stored) so we avoid a setState-in-effect. Mirrors the
  // previous effect's branching exactly: no current password => disabled;
  // changing the password => enabled only if the new-password form is valid;
  // otherwise enabled only if there are other profile changes to save.
  const isSubmitEnabled = (() => {
    if (!currentPassword) return false;
    if (newPassword) return isFormValid;
    if (hasOtherChanges) return true;
    return false;
  })();

  return { isSubmitEnabled };
};