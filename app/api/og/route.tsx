import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";
import { num } from "@/lib/money";

export const runtime = "nodejs";
// Simple render; product lookup is indexed and the output compresses well —
// cache hard at the CDN edge (1 hora).
export const revalidate = 3600;

const INK = "#2c2416";
const BG = "#f9f2e7";
const GOLD = "#d4a632";
const MUTED = "#6b5d4d";

// Fuentes self-hosteads vía Google Fonts CSS (URLs verificadas en vivo).
const INTER = "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf";
const FRAUNCES = "https://fonts.gstatic.com/s/fraunces/v38/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58nib1603gg7S2nfgRYIcaRyjDg.ttf";

export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");

  let title = "Cuadros de arte textil hechos a mano";
  let price = "";
  let photo: string | null = null;

  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, price: true, photo: true },
    });
    if (product) {
      title = product.name;
      price = `$${Math.round(num(product.price)).toLocaleString("es-AR")}`;
      photo = product.photo ?? null;
      // satori exige URLs absolutas: las fotos locales viven "/assets/..."
      const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://nyady.com";
      if (photo?.startsWith("/")) photo = `${base}${photo}`;
    }
  }

  const safeTitle = title.length > 52 ? `${title.slice(0, 49)}…` : title;

  try {
    const [inter, fraunces] = await Promise.all([
      fetch(INTER).then((r) => r.arrayBuffer()),
      fetch(FRAUNCES).then((r) => r.arrayBuffer()),
    ]);

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            background: BG,
            padding: 64,
            flexDirection: "column",
            justifyContent: "space-between",
            border: "1px solid #e5ddd0",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              fontFamily: "Fraunces",
              fontSize: 42,
              letterSpacing: 14,
              fontWeight: 600,
              color: INK,
            }}
          >
            N
            <span style={{ color: GOLD }}>Y</span>
            ADY
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt={safeTitle}
                width={420}
                height={420}
                style={{
                  objectFit: "cover",
                  borderRadius: 18,
                  border: "1px solid #e5ddd0",
                }}
              />
            ) : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div
                style={{
                  fontFamily: "Fraunces",
                  fontSize: photo ? 62 : 96,
                  fontWeight: 600,
                  color: INK,
                  lineHeight: 1.1,
                  maxWidth: photo ? 600 : 1000,
                }}
              >
                {safeTitle}
              </div>
              {price ? (
                <div style={{ fontSize: 52, color: GOLD, fontWeight: 700 }}>
                  {price}
                </div>
              ) : null}
              <div style={{ fontSize: 30, color: MUTED }}>
                Hecho a mano · Envíos a todo el país
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 26,
              color: MUTED,
            }}
          >
            <span>nyady.com</span>
            <span>Mercado Pago · Envío con tracking</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: "Inter", data: inter, weight: 600, style: "normal" },
          { name: "Fraunces", data: fraunces, weight: 600, style: "normal" },
        ],
      }
    );
  } catch {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: BG,
            fontFamily: "Inter",
            fontSize: 72,
            fontWeight: 600,
            color: INK,
          }}
        >
          N Y A D Y
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
};
