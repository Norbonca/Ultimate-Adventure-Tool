/**
 * Site-wide icon gateway — single `lucide-react` import gate.
 *
 * Per CLAUDE.md §3.8 and `modules/00_Reference_Data/03_Icon_Bank.md`,
 * direct imports of `lucide-react` are FORBIDDEN outside this file.
 * Components and pages import named icons from `@/lib/icons`, or use
 * the `Icon` wrapper from `@/components/Icon` with the kebab-case key.
 *
 * Adding a new icon:
 *   1. Verify the kebab-case name exists in `03_Icon_Bank.md`. If not,
 *      add it to the catalog FIRST.
 *   2. Add the named re-export here, alphabetised within its section,
 *      and the kebab-case key in `components/Icon.tsx` ICON_MAP.
 *   3. The icon is then available as `import { NewIcon } from '@/lib/icons'`
 *      and via the `Icon` wrapper with its kebab-case key.
 *
 * Verification: `node .skills/trevu-plan-consistency/scripts/check-icon-bank.mjs`
 */

export {
  // ── Navigation / header (Icon Bank §2) ────────────────────────
  Backpack,
  Bell,
  ChevronDown,
  Compass,
  Globe,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  UserCircle,
  UserPlus,
  Users,
  Wallet,

  // ── Actions (§3) ──────────────────────────────────────────────
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Filter,
  GripVertical,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Search,
  Share2,
  Trash2,
  Upload,
  X,

  // ── Status & feedback (§4) ────────────────────────────────────
  AlertCircle,
  AlertTriangle,
  Archive,
  BadgeCheck,
  CheckCircle2,
  CircleDashed,
  Crown,
  FileText,
  Flame,
  Hourglass,
  Inbox,
  Info,
  KeyRound,
  Loader2,
  FolderOpen,
  Lock,
  Unlock,
  XCircle,

  // ── Media (§5) ────────────────────────────────────────────────
  Camera,
  Crop,
  Image,
  Images,
  Palette,
  Sun,
  UserCircle2,
  Video,
  ZoomIn,
  ZoomOut,

  // ── Trip & timeline (§6) ──────────────────────────────────────
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarX,
  CheckSquare,
  Circle,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Flag,
  ListChecks,
  Map,
  MapPin,
  Megaphone,
  Mountain,
  MountainSnow,
  Package,
  Plane,
  Route,
  Ruler,
  Square,
  Tag,
  UserCheck,
  UserMinus,

  // ── Expense (§7) ──────────────────────────────────────────────
  Banknote,
  Calculator,
  CreditCard,
  FileDown,
  Receipt,
  Scale,
  TrendingUp,

  // ── Communication (§8) ────────────────────────────────────────
  BellOff,
  Bookmark,
  Heart,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Send,
  ThumbsUp,

  // ── Search, filter, view (§9) ─────────────────────────────────
  FilterX,
  GitCommitHorizontal,
  LayoutGrid,
  List,
  SlidersHorizontal,

  // ── Guides & marketplace (§10) ────────────────────────────────
  Award,
  BadgeDollarSign,
  GraduationCap,
  ShoppingCart,
  Siren,
  Star,

  // ── Admin (§11) ───────────────────────────────────────────────
  Activity,
  BarChart3,
  CalendarClock,
  Database,
  HardDrive,
  Server,
  Settings2,
  Shield,
  ShieldCheck,
  Ticket,
  Wrench,
  Zap,

  // ── Categories (§12) ──────────────────────────────────────────
  Bike,
  Bird,
  Building2,
  Footprints,
  Gauge,
  PersonStanding,
  Snowflake,
  Tent,
  Timer,
  Triangle,
  Waves,

  // ── Marketing / value props ───────────────────────────────────
  CloudSun,
  Languages,
  WifiOff,

  // ── M024 Trip Series (Ikon Bank 6.7) ─────────────────────────────
  CalendarPlus,
  Unlink,

  // ── M22 Trip Ideas (Ikon Bank 6.6) ──────────────────────────────
  Lightbulb,
  Hand,
  Pin,

  // ── M211 Útmutatók (Ikon Bank 6.9) ──────────────────────────────
  Captions,
  CaptionsOff,
  CirclePlay,
  CircleQuestionMark,
  Maximize,
  Minimize,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  VideoOff,
} from 'lucide-react';

// Márkaikonok (Facebook, Instagram, X, YouTube, Google): a lucide 1.x nem tartalmazza őket —
// `lib/brand-icons.tsx` (Simple Icons), Icon Bank 0.6. Nem innen exportáljuk, hogy a kapu egyértelmű maradjon.

export type { LucideIcon } from 'lucide-react';

// ── Ikon-geometria szerveroldali rajzoláshoz (ImageResponse, FR-M02-010) ──────
// A lucide-react komponensei kliens-komponensek, a megosztókép (app/og/trips/[slug]) nem hívhatja őket;
// ott az ikonmodul nyers geometriáját (`__iconData.node`) rajzoljuk <svg>-ként. Csak az itt felsorolt
// kulcsok érhetők el: a megosztókép metasora és a kategóriák ikonjai (lib/categories.ts).
import * as IcCalendar from 'lucide-react/icons/calendar';
import * as IcMapPin from 'lucide-react/icons/map-pin';
import * as IcHourglass from 'lucide-react/icons/hourglass';
import * as IcBike from 'lucide-react/icons/bike';
import * as IcCompass from 'lucide-react/icons/compass';
import * as IcFootprints from 'lucide-react/icons/footprints';
import * as IcGauge from 'lucide-react/icons/gauge';
import * as IcMountain from 'lucide-react/icons/mountain';
import * as IcPersonStanding from 'lucide-react/icons/person-standing';
import * as IcSnowflake from 'lucide-react/icons/snowflake';
import * as IcWaves from 'lucide-react/icons/waves';

export type IconNode = [string, Record<string, string>][];

const SVG_ICON_MODULES: Record<string, unknown> = {
  calendar: IcCalendar,
  'map-pin': IcMapPin,
  hourglass: IcHourglass,
  bike: IcBike,
  compass: IcCompass,
  footprints: IcFootprints,
  gauge: IcGauge,
  mountain: IcMountain,
  'person-standing': IcPersonStanding,
  snowflake: IcSnowflake,
  waves: IcWaves,
};

/** A kulcs lucide-geometriája (24×24-es viewBox), vagy null, ha a kulcs nincs a fenti listában. */
export function iconSvgNode(name: string): IconNode | null {
  const mod = SVG_ICON_MODULES[name] as { __iconData?: { node?: IconNode } } | undefined;
  return mod?.__iconData?.node ?? null;
}
