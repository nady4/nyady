import type { Metadata } from "next";
import { Suspense } from "react";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Nueva contraseña",
};

function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

export default Page;
