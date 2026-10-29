import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/email";

export default function robots(): MetadataRoute.Robots {
  const base = getAppUrl().replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/signin", "/register", "/orders", "/cart"]
    },
    sitemap: `${base}/sitemap.xml`,
    host: base
  };
}
