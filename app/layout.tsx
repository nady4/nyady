import type { Metadata, Viewport } from "next";
import { fraunces, inter, cormorantGaramond } from "./fonts";
import { ReduxProvider } from "@/store/provider";
import { NextAuthProvider } from "@/providers/NextAuthProvider";
import NavBar from "@/components/NavBar";
import SiteFooter from "@/components/SiteFooter";
import Toast from "@/components/Toast";
import { getSiteUrl } from "@/lib/site-url";

export const viewport: Viewport = {
  themeColor: "#2c2416",
  width: "device-width",
  initialScale: 1,
};
import "@/styles/globals.scss";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: {
    default: "NYADY | Sandalias Artesanales",
    template: "%s | NYADY",
  },
  description:
    "Encontrá ese par que completa tus días. Calzado para disfrutar de la comodidad sin dejar de lado tu estilo. Sandalias artesanales hechas a mano. Envíos a todo Argentina.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "NYADY | Sandalias Artesanales",
    description:
      "Encontrá ese par que completa tus días. Calzado para disfrutar de la comodidad sin dejar de lado tu estilo. Sandalias artesanales hechas a mano.",
    url: "/",
    siteName: "NYADY",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
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
      "Sandalias artesanales hechas a mano. Envíos a todo Argentina.",
    images: ["/api/og"],
  },
  alternates: {
    canonical: "./",
  },
  metadataBase: new URL(siteUrl),
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
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "NYADY",
    url: siteUrl,
    description:
      "Sandalias artesanales hechas a mano. Envíos a todo Argentina.",
    logo: `${siteUrl}/favicon.png`,
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "NYADY",
    url: siteUrl,
    inLanguage: "es-AR",
  };

  return (
    <html lang="es-AR">
      <body className={`${fraunces.variable} ${inter.variable} ${cormorantGaramond.variable}`} suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <ReduxProvider>
          <NextAuthProvider>
            <NavBar />
            <main id="contenido">{children}</main>
            <SiteFooter />
            <Toast />
          </NextAuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}