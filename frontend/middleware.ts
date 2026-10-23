import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The Next.js frontend and Express backend are separately deployed origins
// (Vercel + Render), so CSP connect-src/img-src must explicitly allow the
// configured API origin — 'self' alone would block every API call, every
// <img> pointing at backend-served uploads, and the chat/interview sockets.
function resolveApiOrigins(): { httpOrigin: string; wsOrigin: string } {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  try {
    const parsed = new URL(apiBaseUrl);
    const wsOrigin = `${parsed.protocol === "https:" ? "wss:" : "ws:"}//${parsed.host}`;
    return { httpOrigin: parsed.origin, wsOrigin };
  } catch {
    return { httpOrigin: "", wsOrigin: "" };
  }
}

const { httpOrigin, wsOrigin } = resolveApiOrigins();

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const connectSrc = ["'self'", httpOrigin, wsOrigin].filter(Boolean).join(" ");
  const imgSrc = ["'self'", "data:", "blob:", httpOrigin].filter(Boolean).join(" ");

  // 'strict-dynamic' + a per-request nonce is the standard Next.js App
  // Router CSP pattern: browsers that understand strict-dynamic ignore the
  // host-source allowances and only trust scripts carrying this nonce (or
  // loaded by an already-trusted, nonced script) — this is what lets us keep
  // script-src free of 'unsafe-inline' despite Next's inline RSC bootstrap.
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline';
    img-src ${imgSrc};
    font-src 'self' data:;
    connect-src ${connectSrc};
    media-src 'self' blob:;
    frame-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({
    request: { headers: requestHeaders }
  });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  matcher: [
    // Skip static assets and Next internals — CSP is meaningless for them and
    // opting them out keeps every page (not just document responses) fast.
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff|woff2)$).*)"
  ]
};
