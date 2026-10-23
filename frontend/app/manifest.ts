import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION } from "@/lib/seo";

// Native Next.js metadata route. Serves /manifest.webmanifest and auto-injects
// <link rel="manifest"> into every page — no extra dependency, no config change.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    lang: "en",
    dir: "ltr",
    theme_color: "#000c13",
    background_color: "#000c13",
    categories: ["business", "education", "productivity"],
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-256.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ],
    shortcuts: [
      {
        name: "Sign in",
        short_name: "Sign in",
        description: "Sign in to your InternAI account",
        url: "/auth/intern",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
      },
      {
        name: "For companies",
        short_name: "Companies",
        description: "Company sign in and hiring tools",
        url: "/auth/company",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
      }
    ]
  };
}
