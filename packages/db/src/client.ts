import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Connection string a környezeti változóból
const connectionString = process.env.DATABASE_URL!;

// PostgreSQL kliens — Supabase-hez optimalizálva
const client = postgres(connectionString, {
  max: 10, // Max connections a pool-ban
  idle_timeout: 20, // Idle connection timeout (másodperc)
  connect_timeout: 10, // Connection timeout (másodperc)
});

// Drizzle ORM instance a teljes sémával
export const db = drizzle(client, { schema });

// Type export
export type Database = typeof db;
