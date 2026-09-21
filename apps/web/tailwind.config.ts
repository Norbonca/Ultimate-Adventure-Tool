import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const legacyColor = (token: string) => `rgb(var(--legacy-${token}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        white: legacyColor("white"),
        black: legacyColor("black"),
        slate: {
          50: legacyColor("slate-50"),
          100: legacyColor("slate-100"),
          200: legacyColor("slate-200"),
          300: legacyColor("slate-300"),
          400: legacyColor("slate-400"),
          500: legacyColor("slate-500"),
          600: legacyColor("slate-600"),
          700: legacyColor("slate-700"),
          800: legacyColor("slate-800"),
          900: legacyColor("slate-900"),
          950: legacyColor("slate-950"),
        },
        teal: {
          50: legacyColor("teal-50"),
          100: legacyColor("teal-100"),
          200: legacyColor("teal-200"),
          300: legacyColor("teal-300"),
          400: legacyColor("teal-400"),
          500: legacyColor("teal-500"),
          600: legacyColor("teal-600"),
          700: legacyColor("teal-700"),
          800: legacyColor("teal-800"),
          900: legacyColor("teal-900"),
          950: legacyColor("teal-950"),
        },
        /* ── Overhaul signal orange ── */
        trevu: {
          50: legacyColor("trevu-50"),
          100: legacyColor("trevu-100"),
          200: legacyColor("trevu-200"),
          300: legacyColor("trevu-300"),
          400: legacyColor("trevu-400"),
          500: legacyColor("trevu-500"),
          600: legacyColor("trevu-600"),
          700: legacyColor("trevu-700"),
          800: legacyColor("trevu-800"),
          900: legacyColor("trevu-900"),
        },
        navy: {
          50: legacyColor("navy-50"),
          100: legacyColor("navy-100"),
          200: legacyColor("navy-200"),
          300: legacyColor("navy-300"),
          400: legacyColor("navy-400"),
          500: legacyColor("navy-500"),
          600: legacyColor("navy-600"),
          700: legacyColor("navy-700"),
          800: legacyColor("navy-800"),
          900: legacyColor("navy-900"),
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
        sm: "var(--legacy-radius-sm)",
        DEFAULT: "var(--legacy-radius-default)",
        md: "var(--legacy-radius-md)",
        lg: "var(--legacy-radius-lg)",
        xl: "var(--legacy-radius-xl)",
        "2xl": "var(--legacy-radius-2xl)",
        "3xl": "var(--legacy-radius-3xl)",
        "trevu": "var(--legacy-radius-trevu)",
        "trevu-lg": "var(--legacy-radius-trevu-lg)",
        "trevu-xl": "var(--legacy-radius-trevu-xl)",
        "trevu-2xl": "var(--legacy-radius-trevu-2xl)",
        "trevu-3xl": "var(--legacy-radius-trevu-3xl)",
        "chip": "var(--legacy-radius-chip)",
      },
      boxShadow: {
        sm: "var(--legacy-shadow-sm)",
        DEFAULT: "var(--legacy-shadow-default)",
        md: "var(--legacy-shadow-md)",
        lg: "var(--legacy-shadow-lg)",
        xl: "var(--legacy-shadow-xl)",
        "2xl": "var(--legacy-shadow-2xl)",
        inner: "var(--legacy-shadow-inner)",
        "trevu": "var(--legacy-shadow-trevu)",
        "trevu-sm": "var(--legacy-shadow-trevu-sm)",
        "trevu-lg": "var(--legacy-shadow-trevu-lg)",
        "trevu-xl": "var(--legacy-shadow-trevu-xl)",
        "trevu-glow": "var(--legacy-shadow-trevu-glow)",
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
