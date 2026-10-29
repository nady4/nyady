import type { Metadata } from "next";

// Account surfaces never belong in search indexes (thin / private content).
export const metadata: Metadata = {
  title: "Cuenta",
  robots: { index: false, follow: true },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
