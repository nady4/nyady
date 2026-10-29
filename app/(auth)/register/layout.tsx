import type { Metadata } from "next";

// Client page components can't export metadata: this layout carries the
// title (and a noindex) for the register flow.
export const metadata: Metadata = {
  title: "Creá tu cuenta",
  robots: { index: false, follow: true },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
