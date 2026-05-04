"use client";
import { useState, useEffect, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useValidateAuth } from "@/hooks/useValidateAuth";
import { useValidateSettings } from "@/hooks/useValidateSettings";
import { updateUser } from "@/actions/user";
import FormContainer from "@/components/FormContainer";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [initialEmail, setInitialEmail] = useState("");
  const [initialUsername, setInitialUsername] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (session?.user) {
      const userEmail = session.user.email || "";
      const userUsername = session.user.username || "";
      setEmail(userEmail);
      setUsername(userUsername);
      setInitialEmail(userEmail);
      setInitialUsername(userUsername);
    }
  }, [session]);

  const hasOtherChanges =
    email !== initialEmail || username !== initialUsername;

  const { isFormValid, error, validateForm } = useValidateAuth({
    email,
    username,
    password: newPassword,
    confirmPassword: newPassword,
  });

  const { isSubmitEnabled } = useValidateSettings({
    currentPassword,
    newPassword,
    isFormValid,
    hasOtherChanges,
  });

  const handleSubmit = (formData: FormData) => {
    if (newPassword && !validateForm()) return;
    startTransition(async () => {
      try {
        await updateUser(formData);
        window.location.href = "/catalog";
      } catch (err) {
        console.error(err);
      }
    });
  };

  if (status === "loading")
    return (
      <FormContainer title="Account Settings">
        <p className="loading">Loading session...</p>
      </FormContainer>
    );

  return (
    <div className="form-page">
      <FormContainer title="Account Settings">
        <form action={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="New Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="text"
            name="username"
            placeholder="New Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            name="newPassword"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            type="password"
            name="currentPassword"
            placeholder="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={!isSubmitEnabled || pending}>
            {pending ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </FormContainer>
    </div>
  );
}