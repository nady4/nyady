import type { Metadata } from "next";

// Auth pages are utility surfaces: keep them out of the index (robots.txt
// already disallows /signin and /register; /register didn't define robots).
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
