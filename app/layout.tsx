import type { Metadata } from "next";
import { fraunces, inter } from "./fonts";
import { ReduxProvider } from "@/store/provider";
import { NextAuthProvider } from "@/providers/NextAuthProvider";
import NavBar from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import "@/styles/globals.scss";

export const metadata: Metadata = {
  title: {
    default: "NYADY | Pantuflas y Pantubotas Artesanales",
    template: "%s | NYADY",
  },
  description:
    "Encontrá el equilibrio perfecto entre comodidad, diseño y calidad. Pantuflas y pantubotas artesanales hechas a mano. Envíos a todo Argentina.",
  keywords: [
    "pantuflas",
    "pantubotas",
    "zapatillas",
    "pantuflas artesanales",
    "pantuflas cómodas",
    "pantubotas de polar",
    "NYADY",
    "zapatillas de casa",
    "calzado indoor",
    "pantuflas mujer",
    "pantuflas hombre",
    "pantuflas niño",
  ],
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "NYADY | Pantuflas y Pantubotas Artesanales",
    description:
      "Encontrá el equilibrio perfecto entre comodidad, diseño y calidad. Pantuflas y pantubotas artesanales hechas a mano.",
    url: "https://nyady.com",
    siteName: "NYADY",
    images: [
      {
        url: "https://nyady.com/assets/products/pantuflon.png",
        width: 1200,
        height: 630,
        alt: "NYADY - Pantuflas y Pantubotas Artesanales",
      },
    ],
    locale: "es_AR",
    type: "website",
  },
  metadataBase: new URL("https://nyady.com"),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
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