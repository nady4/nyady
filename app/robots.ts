import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl().replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/signin",
        "/register",
        "/orders",
        "/cart",
        "/wishlist",
        "/cuenta",
        "/address",
        "/success",
        "/pending",
        "/failure",
        "/forgot-password",
        "/reset-password",
      ]
    },
    sitemap: `${base}/sitemap.xml`
  };
}
