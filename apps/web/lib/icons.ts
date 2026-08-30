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
  ArrowRight,
  ArrowUpDown,
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
  BarChart3,
  Database,
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

  // ── Social ───────────────────────────────────────────────────
  Facebook,
  Instagram,
  Twitter,
  Youtube,
} from 'lucide-react';

export type { LucideIcon } from 'lucide-react';
