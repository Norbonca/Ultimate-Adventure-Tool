import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── TREVU Primary ── */
        trevu: {
          50:  "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#14B8A6",  /* teal-light */
          600: "#0D9488",  /* ★ primary teal */
          700: "#0F766E",  /* teal-dark */
          800: "#115E59",
          900: "#134E4A",
        },
        navy: {
          50:  "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",  /* ★ deep-navy */
        },

        /* ── Accent Colors ── */
        coral:   { DEFAULT: "#F97066", light: "#FCA5A1" },
        sage:    { DEFAULT: "#6EE7B7" },
        golden:  { DEFAULT: "#FBBF24" },
        violet:  { DEFAULT: "#8B5CF6" },
        orange:  { DEFAULT: "#F97316" },

        /* ── Category Colors ── */
        cat: {
          hiking:     "#059669",
          climbing:   "#92400E",
          water:      "#0D9488",
          cycling:    "#D97706",
          running:    "#DC2626",
          winter:     "#3B82F6",
          expedition: "#8B5CF6",
          motorsport: "#B91C1C",
        },

        /* ── Semantic Aliases ── */
        brand: {
          50:  "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          900: "#134E4A",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        display: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        "trevu":  "10px",
        "trevu-lg": "12px",
        "trevu-xl": "14px",
        "trevu-2xl": "16px",
        "trevu-3xl": "20px",
      },
      boxShadow: {
        "trevu":    "0 2px 8px rgba(13, 148, 136, 0.25)",
        "trevu-sm": "0 1px 3px rgba(0, 0, 0, 0.06)",
        "trevu-lg": "0 8px 24px rgba(0, 0, 0, 0.08)",
        "trevu-xl": "0 24px 80px rgba(15, 23, 42, 0.18)",
        "trevu-glow": "0 2px 12px rgba(13, 148, 136, 0.12)",
      },
      animation: {
        "shimmer": "shimmer 1.5s infinite",
        "slide-up": "slideUp 0.3s ease",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        slideUp: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
