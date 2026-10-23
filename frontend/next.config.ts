import type { NextConfig } from "next";
import pkg from "./package.json";

// Service-worker cache versioning. APP_VERSION is the human-readable semver
// (version awareness); APP_BUILD is unique per build so precached non-hashed
// assets (manifest, icons, offline.html) invalidate on every deployment.
const APP_VERSION = pkg.version;
const APP_BUILD = process.env.NEXT_PUBLIC_APP_BUILD || Date.now().toString(36);

// Content-Security-Policy is set per-request in middleware.ts (it needs a
// fresh nonce every request for Next.js's inline RSC-streaming scripts) —
// only the static, non-nonce headers live here.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()"
  },
  { key: "X-DNS-Prefetch-Control", value: "off" }
];

if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains"
  });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.1.10"],
  devIndicators: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
    NEXT_PUBLIC_APP_BUILD: APP_BUILD
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
    staleTimes: {
      dynamic: 120,
      static: 300
    }
  },
  images: {
    formats: ["image/avif", "image/webp"]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  },
  async rewrites() {
    return [
      { source: "/dashboard/companyCEO", destination: "/dashboard/company" },
      { source: "/dashboard/companyCEO/:path*", destination: "/dashboard/company/:path*" },
      { source: "/dashboard/companyHR", destination: "/dashboard/company" },
      { source: "/dashboard/companyHR/:path*", destination: "/dashboard/company/:path*" }
    ];
  }
};

export default nextConfig;
