"use client";

interface ConfirmSubmitProps {
  label: string;
  message: string;
  className?: string;
}

/**
 * Submit button reserved for destructive server actions: asks for native
 * confirmation before the form posts (no accidental one-tap deletes).
 */
export default function ConfirmSubmit({
  label,
  message,
  className,
}: ConfirmSubmitProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}
