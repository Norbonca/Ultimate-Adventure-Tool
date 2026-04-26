/**
 * Site-wide icon gateway — single `lucide-react` import gate.
 *
 * Per CLAUDE.md §3.8 and `modules/00_Reference_Data/03_Icon_Bank.md`,
 * direct imports of `lucide-react` are FORBIDDEN outside this file.
 * Components and pages import named icons from `@/lib/icons` instead.
 *
 * Adding a new icon:
 *   1. Verify the kebab-case name exists in `03_Icon_Bank.md`. If not,
 *      add it to the catalog FIRST.
 *   2. Add the named re-export here, alphabetised within its section.
 *   3. The icon is then available as `import { NewIcon } from '@/lib/icons'`.
 *
 * Verification: `node .skills/trevu-plan-consistency/scripts/check-icon-bank.mjs`
 */

export {
  // ── Navigation / header ───────────────────────────────────────
  ChevronDown,
  Home,
  Menu,
  Bell,
  Sparkles,
  Users,
  CreditCard,

  // ── Search & filters ──────────────────────────────────────────
  Search,
  MapPin,
  Calendar,
  Compass,
  Star,
  ArrowUpDown,
  LayoutGrid,
  List,

  // ── Categories (touring) ──────────────────────────────────────
  Mountain,
  Triangle,
  Waves,
  Gauge,
  Bike,
  Timer,
  Snowflake,

  // ── Marketing / value props ───────────────────────────────────
  Zap,
  Wallet,
  WifiOff,
  Shield,
  Package,
  CloudSun,
  Plane,
  Languages,

  // ── Social ───────────────────────────────────────────────────
  Instagram,
  Twitter,
  Facebook,
  Youtube,
} from 'lucide-react';

export type { LucideIcon } from 'lucide-react';
