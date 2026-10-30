import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Function-bundle diet: the store only runs PostgreSQL through the
  // prisma-client-js library engine (.prisma/client .so, required at
  // runtime — never excluded). Everything else under @prisma/engines and
  // the dead wasm runtimes are pruned post-generate (scripts/) and here via
  // tracing excludes, because Functions Storage is billed per retained
  // deployment.
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@prisma/engines/**",
      "node_modules/@prisma/client/runtime/query_engine_bg.{cockroachdb,mysql,sqlserver,sqlite}.*",
      "node_modules/@prisma/client/runtime/query_compiler_bg.{cockroachdb,mysql,sqlserver,sqlite}.*",
      "node_modules/@prisma/client/runtime/query_compiler_bg.postgresql.*",
    ],
  },
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
