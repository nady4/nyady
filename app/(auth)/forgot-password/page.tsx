import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Olvidaste tu contraseña - NYADY",
  description: "Recuperá el acceso a tu cuenta de NYADY.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
