import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const receptionistsTable = pgTable("receptionists", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").notNull().unique(),
  username: text("username").notNull().unique(),
  fullName: text("full_name").notNull(),
  mobile: text("mobile"),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "receptionist", "cashier"] })
    .notNull()
    .default("receptionist"),
  status: text("status", { enum: ["active", "inactive"] })
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
});

export type Receptionist = typeof receptionistsTable.$inferSelect;
export type InsertReceptionist = typeof receptionistsTable.$inferInsert;

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  receptionistId: integer("receptionist_id").references(
    () => receptionistsTable.id,
    { onDelete: "set null" },
  ),
  action: text("action", {
    enum: [
      "login",
      "logout",
      "login_failed",
      "password_reset",
      "account_created",
      "account_updated",
      "account_deleted",
    ],
  }).notNull(),
  ipAddress: text("ip_address"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
