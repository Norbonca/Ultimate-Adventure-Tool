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
        /* ── Overhaul signal orange ── */
        trevu: {
          50:  "#FFF4EF",
          100: "#FBE7DF",
          200: "#F8C8B6",
          300: "#F58C62",
          400: "#F0693A",
          500: "#EA5A27",
          600: "#E4531E",
          700: "#C94718",
          800: "#A93A10",
          900: "#7D2C0D",
        },
        navy: {
          50:  "#F7F8F5",
          100: "#EDEFEA",
          200: "#CBD1CB",
          300: "#B7BEB8",
          400: "#9EA69F",
          500: "#737B75",
          600: "#4B524D",
          700: "#303631",
          800: "#1B1F1C",
          900: "#151916",
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
          50:  "#FFF4EF",
          100: "#FBE7DF",
          200: "#F8C8B6",
          300: "#F58C62",
          400: "#F0693A",
          500: "#EA5A27",
          600: "#E4531E",
          700: "#C94718",
          800: "#A93A10",
          900: "#7D2C0D",
        },
      },
      fontFamily: {
        sans: ['"Sofia Sans"', "system-ui", "sans-serif"],
        display: ['"Sofia Sans Extra Condensed"', '"Sofia Sans"', "system-ui", "sans-serif"],
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
        "trevu":  "0",
        "trevu-lg": "0",
        "trevu-xl": "0",
        "trevu-2xl": "0",
        "trevu-3xl": "0",
        "chip": "0",
      },
      boxShadow: {
        "trevu": "none",
        "trevu-sm": "none",
        "trevu-lg": "none",
        "trevu-xl": "none",
        "trevu-glow": "none",
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
