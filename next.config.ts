import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Seed/sample products only.
        protocol: "https",
        hostname: "http2.mlstatic.com",
      },
      {
        // One legacy product row.
        protocol: "https",
        hostname: "acdn-us.mitiendanube.com",
      },
      {
        // Legacy product rows may still reference marketplace CDNs (1 image
        // each); everything else is local /assets/ or Vercel Blob.
        protocol: "https",
        hostname: "lrsa-media.lojasrenner.com.br",
      },
      {
        protocol: "https",
        hostname: "equipovallejo.vtexassets.com",
      },
      {
        protocol: "https",
        hostname: "encrypted-tbn0.gstatic.com",
      },
      {
        // Vercel Blob uploads (product & banner images from the admin).
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
