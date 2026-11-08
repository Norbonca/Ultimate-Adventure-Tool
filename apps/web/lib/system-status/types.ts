/**
 * M151 Rendszerállapot — közös típusok (szerver és kliens).
 * Spec: modules/15_Admin_Panel/151_System_Status/README.md · terv: design/D15_Admin.pen#ihHfu
 */

export type CheckState = "ok" | "warn" | "down";

export type CheckGroup = "platform" | "data" | "external";

export type CheckKey =
  | "app"
  | "database"
  | "migrations"
  | "auth"
  | "storage"
  | "cron"
  | "fx"
  | "extFrankfurter"
  | "extNominatim"
  | "extEox";

/** Megjelenítendő érték: i18n-kulcs (`admin.system.value.<key>`) + paraméterek. Az időpontok ISO-ként jönnek, a kliens formázza. */
export interface CheckValue {
  key: string;
  params?: Record<string, string | number>;
}

export interface CronJobStatus {
  name: string;
  schedule: string;
  active: boolean;
  status: string | null;
  startTime: string | null;
}

export interface CheckResult {
  key: CheckKey;
  group: CheckGroup;
  state: CheckState;
  critical: boolean;
  value: CheckValue | null;
  cron?: CronJobStatus[];
}

export interface VersionInfo {
  environment: string;
  commitSha: string | null;
  commitMessage: string | null;
  region: string | null;
}

export interface OverallStatus {
  state: CheckState;
  ok: number;
  warn: number;
  down: number;
  total: number;
  /** A nem rendben lévő ellenőrzések kulcsai, megjelenítési sorrendben. */
  affected: CheckKey[];
}

export interface SystemStatus {
  checkedAt: string;
  overall: OverallStatus;
  version: VersionInfo;
  checks: CheckResult[];
}
