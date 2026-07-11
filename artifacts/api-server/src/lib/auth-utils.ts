import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@workspace/db";
import { receptionistsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateEmployeeId(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `EMP${num}`;
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Seed a default admin account on first startup.
 * Only runs when the receptionists table is empty.
 */
export async function seedAdminIfNeeded(): Promise<void> {
  try {
    const existing = await db.select({ id: receptionistsTable.id }).from(receptionistsTable).limit(1);
    if (existing.length > 0) return;

    const passwordHash = await hashPassword("Admin@123");
    await db.insert(receptionistsTable).values({
      employeeId: "ADMIN001",
      username: "admin",
      fullName: "Admin",
      role: "admin",
      status: "active",
      passwordHash,
    });

    logger.info("Default admin account created — username: admin, password: Admin@123 (change immediately)");
  } catch (err) {
    logger.error({ err }, "Failed to seed admin account");
  }
}

/**
 * Seed the "crust" receptionist account if it doesn't already exist.
 */
export async function seedCrustUserIfNeeded(): Promise<void> {
  try {
    const existing = await db
      .select({ id: receptionistsTable.id })
      .from(receptionistsTable)
      .where(eq(receptionistsTable.username, "crust"))
      .limit(1);
    if (existing.length > 0) return;

    const passwordHash = await hashPassword("crust123");
    await db.insert(receptionistsTable).values({
      employeeId: generateEmployeeId(),
      username: "crust",
      fullName: "Crust",
      role: "receptionist",
      status: "active",
      passwordHash,
    });

    logger.info("Crust account created — username: crust");
  } catch (err) {
    logger.error({ err }, "Failed to seed crust account");
  }
}
