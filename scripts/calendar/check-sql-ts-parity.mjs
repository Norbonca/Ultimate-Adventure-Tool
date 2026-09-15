#!/usr/bin/env node
// M23 Calendar — az SQL-szabálymotor (037) és a TS-motor (apps/web/lib/calendar/rules.ts) paritása
// a helyi adatbázis minden `generated` előfordulásán.
// Futtatás: node scripts/calendar/check-sql-ts-parity.mjs  (a helyi Supabase fut: supabase_db_trevu-local)

import { execFileSync } from "node:child_process";
import { ruleOccurrence } from "../../apps/web/lib/calendar/rules.ts";

const sql = `SELECT coalesce(json_agg(json_build_object('key', p.key, 'country', p.country_code, 'kind', p.rule_kind,
  'params', p.rule_params, 'duration', p.duration_days, 'year', o.year, 'earliest', o.earliest, 'latest', o.latest)), '[]')
  FROM ref_calendar_occurrences o JOIN ref_calendar_periods p ON p.id = o.period_id WHERE o.status = 'generated'`;
const container = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_trevu-local";
const rows = JSON.parse(execFileSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-Atc", sql], { encoding: "utf8" }));

const mismatches = rows.filter((row) => {
  const range = ruleOccurrence({ kind: row.kind, params: row.params, durationDays: row.duration }, row.year);
  return range?.earliest !== row.earliest || range?.latest !== row.latest;
});
console.log(`generated előfordulás: ${rows.length}, eltérés: ${mismatches.length}`);
for (const row of mismatches.slice(0, 10)) console.log(" ", row);
process.exit(mismatches.length ? 1 : 0);
