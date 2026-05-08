import type { Metadata } from "next";
import { fraunces, inter } from "./fonts";
import { ReduxProvider } from "@/store/provider";
import { NextAuthProvider } from "@/providers/NextAuthProvider";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import "@/styles/globals.scss";

export const metadata: Metadata = {
  title: "NYADY",
  description: "E-commerce app",
  icons: "/favicon.svg",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${inter.variable}`} suppressHydrationWarning>
        <ReduxProvider>
          <NextAuthProvider>
            <NavBar />
            {children}
            <Footer />
          </NextAuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}