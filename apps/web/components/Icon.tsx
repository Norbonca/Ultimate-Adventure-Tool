/**
 * Icon — Site-wide Icon Bank wrapper (`name` = kebab-case lucide key).
 *
 * Source of truth: `modules/00_Reference_Data/03_Icon_Bank.md`.
 * Every key below is a kebab-case lucide name listed in the bank; the same
 * keys are stored in the DB (`trip_phases.icon`, `categories.icon`) and used
 * in the Pencil designs (`design/*.pen`, icon property).
 *
 * No hooks — safe in Server and Client Components alike.
 */

import * as L from "@/lib/icons";
import type { LucideIcon } from "@/lib/icons";

export const ICON_MAP: Record<string, LucideIcon> = {
  // navigation
  backpack: L.Backpack,
  bell: L.Bell,
  "chevron-down": L.ChevronDown,
  compass: L.Compass,
  globe: L.Globe,
  home: L.Home,
  "layout-dashboard": L.LayoutDashboard,
  "log-in": L.LogIn,
  "log-out": L.LogOut,
  menu: L.Menu,
  settings: L.Settings,
  sparkles: L.Sparkles,
  "user-circle": L.UserCircle,
  "user-plus": L.UserPlus,
  users: L.Users,
  wallet: L.Wallet,
  // actions
  "arrow-left": L.ArrowLeft,
  "arrow-right": L.ArrowRight,
  "arrow-up-down": L.ArrowUpDown,
  check: L.Check,
  "chevron-left": L.ChevronLeft,
  "chevron-right": L.ChevronRight,
  copy: L.Copy,
  download: L.Download,
  "external-link": L.ExternalLink,
  eye: L.Eye,
  filter: L.Filter,
  "grip-vertical": L.GripVertical,
  "link-2": L.Link2,
  "more-horizontal": L.MoreHorizontal,
  pencil: L.Pencil,
  plus: L.Plus,
  "refresh-cw": L.RefreshCw,
  rocket: L.Rocket,
  save: L.Save,
  search: L.Search,
  "share-2": L.Share2,
  "trash-2": L.Trash2,
  upload: L.Upload,
  x: L.X,
  // status
  "alert-circle": L.AlertCircle,
  "alert-triangle": L.AlertTriangle,
  archive: L.Archive,
  "badge-check": L.BadgeCheck,
  "check-circle-2": L.CheckCircle2,
  "circle-dashed": L.CircleDashed,
  crown: L.Crown,
  "file-text": L.FileText,
  flame: L.Flame,
  hourglass: L.Hourglass,
  inbox: L.Inbox,
  info: L.Info,
  "key-round": L.KeyRound,
  "loader-2": L.Loader2,
  "folder-open": L.FolderOpen,
  lock: L.Lock,
  unlock: L.Unlock,
  "x-circle": L.XCircle,
  // media
  camera: L.Camera,
  crop: L.Crop,
  image: L.Image,
  images: L.Images,
  palette: L.Palette,
  sun: L.Sun,
  "user-circle-2": L.UserCircle2,
  video: L.Video,
  "zoom-in": L.ZoomIn,
  "zoom-out": L.ZoomOut,
  // trip & timeline
  calendar: L.Calendar,
  "check-square": L.CheckSquare,
  circle: L.Circle,
  "clipboard-check": L.ClipboardCheck,
  "clipboard-list": L.ClipboardList,
  clock: L.Clock,
  flag: L.Flag,
  "list-checks": L.ListChecks,
  map: L.Map,
  "map-pin": L.MapPin,
  megaphone: L.Megaphone,
  mountain: L.Mountain,
  "mountain-snow": L.MountainSnow,
  package: L.Package,
  plane: L.Plane,
  route: L.Route,
  ruler: L.Ruler,
  square: L.Square,
  tag: L.Tag,
  "user-check": L.UserCheck,
  "user-minus": L.UserMinus,
  // expense
  banknote: L.Banknote,
  calculator: L.Calculator,
  "credit-card": L.CreditCard,
  "file-down": L.FileDown,
  receipt: L.Receipt,
  scale: L.Scale,
  "trending-up": L.TrendingUp,
  // communication
  "bell-off": L.BellOff,
  bookmark: L.Bookmark,
  heart: L.Heart,
  mail: L.Mail,
  "message-circle": L.MessageCircle,
  "message-square": L.MessageSquare,
  phone: L.Phone,
  send: L.Send,
  "thumbs-up": L.ThumbsUp,
  // search, filter, view
  "filter-x": L.FilterX,
  "git-commit-horizontal": L.GitCommitHorizontal,
  "layout-grid": L.LayoutGrid,
  list: L.List,
  "sliders-horizontal": L.SlidersHorizontal,
  // guides & marketplace
  award: L.Award,
  "badge-dollar-sign": L.BadgeDollarSign,
  "graduation-cap": L.GraduationCap,
  "shopping-cart": L.ShoppingCart,
  siren: L.Siren,
  star: L.Star,
  // admin
  "bar-chart-3": L.BarChart3,
  database: L.Database,
  "settings-2": L.Settings2,
  shield: L.Shield,
  "shield-check": L.ShieldCheck,
  ticket: L.Ticket,
  wrench: L.Wrench,
  zap: L.Zap,
  // categories
  bike: L.Bike,
  bird: L.Bird,
  "building-2": L.Building2,
  footprints: L.Footprints,
  gauge: L.Gauge,
  "person-standing": L.PersonStanding,
  snowflake: L.Snowflake,
  tent: L.Tent,
  timer: L.Timer,
  triangle: L.Triangle,
  waves: L.Waves,
  // marketing / value props
  "cloud-sun": L.CloudSun,
  languages: L.Languages,
  "wifi-off": L.WifiOff,
};

export type IconName = keyof typeof ICON_MAP | (string & {});

interface IconProps {
  name: IconName;
  /** Pixel size (width = height). Default 18. */
  size?: number;
  className?: string;
  strokeWidth?: number;
  /** Accessible label; when omitted the icon is decorative (aria-hidden). */
  label?: string;
}

/** Fallback when a name is not in the bank — visible in dev, neutral in prod. */
const Fallback = L.Circle;

export function Icon({ name, size = 18, className, strokeWidth = 1.75, label }: IconProps) {
  const Cmp = ICON_MAP[name] ?? Fallback;
  if (process.env.NODE_ENV !== "production" && !ICON_MAP[name]) {
    console.warn(`[Icon] "${name}" is not in the Icon Bank (03_Icon_Bank.md) — add it first.`);
  }
  return (
    <Cmp
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
    />
  );
}
