import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "http2.mlstatic.com",
      },
      {
        protocol: "https",
        hostname: "acdn-us.mitiendanube.com",
      },
      {
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
        protocol: "https",
        hostname: "images.unsplash.com",
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
