import type { Metadata } from "next";
import { fraunces, inter, cormorantGaramond } from "./fonts";
import { ReduxProvider } from "@/store/provider";
import { NextAuthProvider } from "@/providers/NextAuthProvider";
import NavBar from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import "@/styles/globals.scss";

export const metadata: Metadata = {
  title: {
    default: "NYADY | Sandalias Artesanales",
    template: "%s | NYADY",
  },
  description:
    "Encontrá ese par que completa tus días. Calzado para disfrutar de la comodidad sin dejar de lado tu estilo. Sandalias artesanales hechas a mano. Envíos a todo Argentina.",
  keywords: [
    "sandalias",
    "sandalias artesanales",
    "sandalias de mujer",
    "sandalias cómodas",
    "sandalias de plataforma",
    "calzado artesanal",
    "calzado hecho a mano",
    "NYADY",
    "zapatillas de casa",
    "calzado indoor",
    "comprar sandalias argentina",
  ],
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "NYADY | Sandalias Artesanales",
    description:
      "Encontrá ese par que completa tus días. Calzado para disfrutar de la comodidad sin dejar de lado tu estilo. Sandalias artesanales hechas a mano.",
    url: "https://nyady.com",
    siteName: "NYADY",
    images: [
      {
        url: "https://nyady.com/assets/products/Abril/1_negro.png",
        width: 1200,
        height: 1200,
        alt: "NYADY - Sandalias Artesanales",
      },
    ],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NYADY | Sandalias Artesanales",
    description:
      "Encontrá ese par que completa tus días. Calzado para disfrutar de la comodidad sin dejar de lado tu estilo. Sandalias artesanales hechas a mano.",
    images: ["https://nyady.com/assets/products/Abril/1_negro.png"],
  },
  alternates: {
    canonical: "https://nyady.com",
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
      <body className={`${fraunces.variable} ${inter.variable} ${cormorantGaramond.variable}`} suppressHydrationWarning>
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