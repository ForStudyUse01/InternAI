import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/auth", "/auth/intern", "/auth/company", "/auth/admin", "/portfolio/", "/company/"],
      disallow: ["/dashboard", "/dashboard/", "/interview", "/interview/", "/access-denied", "/session-expired"]
    },
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
