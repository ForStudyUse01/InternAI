import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #000c13 0%, #04202f 100%)",
          fontFamily: "sans-serif"
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -2
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 36,
            color: "#0274BD",
            fontWeight: 500
          }}
        >
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    { ...size }
  );
}
