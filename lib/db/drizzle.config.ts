import { defineConfig } from "drizzle-kit";
import path from "path";
import { buildSupabaseUrl } from "./src/supabase-url";

const connectionString = buildSupabaseUrl() || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Supabase credentials or DATABASE_URL must be set, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
