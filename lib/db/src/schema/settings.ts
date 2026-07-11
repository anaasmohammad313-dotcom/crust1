import { integer, pgTable } from "drizzle-orm/pg-core";

// Singleton settings row (id is always 1) holding POS-wide configuration,
// such as how many tables the admin has configured.
export const settingsTable = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  maxTables: integer("max_tables").notNull().default(20),
});

export type Settings = typeof settingsTable.$inferSelect;
