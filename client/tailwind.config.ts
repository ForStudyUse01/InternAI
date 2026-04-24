import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "app-bg": "#0b0f19",
        "app-card": "#111827",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.35), 0 12px 32px rgba(0, 0, 0, 0.45)",
        "card-hover": "0 8px 24px rgba(99, 102, 241, 0.18), 0 20px 48px rgba(0, 0, 0, 0.5)",
      },
      keyframes: {
        "gradient-sweep": {
          "0%, 100%": { opacity: "0.88", transform: "scale(1) translate3d(0,0,0)" },
          "50%": { opacity: "1", transform: "scale(1.05) translate3d(1%, -1%, 0)" },
        },
        "blob-a": {
          "0%, 100%": { opacity: "0.4", transform: "translate3d(0,0,0)" },
          "50%": { opacity: "0.55", transform: "translate3d(6%, 4%, 0)" },
        },
        "blob-b": {
          "0%, 100%": { opacity: "0.35", transform: "translate3d(0,0,0)" },
          "50%": { opacity: "0.5", transform: "translate3d(-5%, -6%, 0)" },
        },
      },
      animation: {
        "gradient-sweep": "gradient-sweep 17s ease-in-out infinite",
        "blob-a": "blob-a 19s ease-in-out infinite",
        "blob-b": "blob-b 21s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
