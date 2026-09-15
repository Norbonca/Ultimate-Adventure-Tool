import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

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

        /* ── Felület-mód tokenek (Brand Guide v2, 1b) ──
           CSS-változóra képeznek le, ezért a [data-surface="night"] scope
           automatikusan átszínezi őket. Night-felületre szánt komponens
           ezeket használja, nem a fenti nyers hexes palettát. */
        canvas: "var(--color-bg)",
        surface: "var(--color-surface)",
        ink: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
          secondary: "var(--color-text-secondary)",
          body: "var(--color-text-body)",
        },
        line: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
        },
        accent: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          on: "var(--color-on-primary)",
        },
        ghost: "var(--color-ghost)",
        glass: "var(--color-glass)",
        scrim: "var(--color-scrim)",
        "cat-token": {
          hiking: "var(--cat-hiking)",
          climbing: "var(--cat-climbing)",
          water: "var(--cat-water)",
          cycling: "var(--cat-cycling)",
          running: "var(--cat-running)",
          winter: "var(--cat-winter)",
          expedition: "var(--cat-expedition)",
          motorsport: "var(--cat-motorsport)",
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
      fontSize: {
        /* Hero Display — csak Night hero (Brand Guide v2 §4) */
        "hero-display": ["var(--font-hero-display)", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
        "hero-display-mobile": ["var(--font-hero-display-mobile)", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
      },
      backgroundImage: {
        /* Olvashatósági gradiens a hero-fotón — kontrasztfeltétel (v2 §5) */
        "hero-scrim": "var(--hero-scrim)",
        "hero-scrim-mobile": "var(--hero-scrim-mobile)",
      },
      borderRadius: {
        "trevu":  "10px",
        "trevu-lg": "12px",
        "trevu-xl": "14px",
        "trevu-2xl": "16px",
        "trevu-3xl": "20px",
        "chip": "6px",       /* brand §3 — kategória/státusz chip */
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
  plugins: [
    /* `night:` variáns — a Night-régión belül, de nem egy beágyazott Day-régióban
       (Brand Guide v2 §2, §8). Csak olyan közös komponensben kell (AppHeader), amely
       Day és Night oldalon is fut; új Night-komponens a szemantikus színeket használja. */
    plugin(({ addVariant }) => {
      addVariant("night", [
        '[data-surface="night"] &:not([data-surface="day"] *)',
        '&[data-surface="night"]',
      ]);
    }),
  ],
};

export default config;
