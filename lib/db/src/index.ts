import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { buildSupabaseUrl } from "./supabase-url";

const { Pool } = pg;

const supabaseUrl = buildSupabaseUrl();
const connectionString = supabaseUrl || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Supabase credentials or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString,
  ssl: supabaseUrl ? { rejectUnauthorized: false } : undefined,
  max: supabaseUrl ? 10 : undefined,
  idleTimeoutMillis: supabaseUrl ? 30_000 : undefined,
  connectionTimeoutMillis: supabaseUrl ? 10_000 : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
