import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  future: {
    hoverOnlyWhenSupported: true
  },
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#b3ceff",
          300: "#85adff",
          400: "#4a85ff",
          500: "#1f6fff",
          600: "#1459da",
          700: "#1149b3",
          800: "#0e3f92",
          900: "#0a2f70",
          950: "#061b42"
        },
        internai: {
          bg: "#05060A",
          surface: "#0B1220",
          elevated: "#111827",
          blue: "#3B82F6",
          "blue-deep": "#2563EB",
          cyan: "#22D3EE",
          orange: "#F97316",
          pink: "#FB7185",
          green: "#22D3EE",
          purple: "#A78BFA",
          text: "#E5E7EB",
          muted: "#B0B8C5"
        },
        slateDeep: "#0f172a",
        ink: "#0a1020"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
        glow: "0 18px 40px rgba(31, 111, 255, 0.22)"
      },
      backgroundImage: {
        hero: "radial-gradient(circle at 10% 10%, rgba(31, 111, 255, 0.16), transparent 35%), radial-gradient(circle at 80% 0%, rgba(37, 99, 235, 0.14), transparent 30%), linear-gradient(180deg, #edf4ff 0%, #f7fbff 75%)"
      }
    }
  },
  plugins: []
};

export default config;
