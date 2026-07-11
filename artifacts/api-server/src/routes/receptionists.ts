import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { receptionistsTable, auditLogsTable } from "@workspace/db/schema";
import { hashPassword, generateEmployeeId } from "../lib/auth-utils";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

// All receptionist management routes require admin
router.use(requireAdmin);

// GET /api/receptionists
router.get("/receptionists", async (_req, res) => {
  const rows = await db
    .select({
      id: receptionistsTable.id,
      employeeId: receptionistsTable.employeeId,
      username: receptionistsTable.username,
      fullName: receptionistsTable.fullName,
      mobile: receptionistsTable.mobile,
      email: receptionistsTable.email,
      role: receptionistsTable.role,
      status: receptionistsTable.status,
      createdAt: receptionistsTable.createdAt,
      lastLogin: receptionistsTable.lastLogin,
    })
    .from(receptionistsTable)
    .orderBy(receptionistsTable.createdAt);
  res.json(rows);
});

// POST /api/receptionists
router.post("/receptionists", async (req, res) => {
  const { username, fullName, mobile, email, password, role } = req.body as {
    username?: string;
    fullName?: string;
    mobile?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  if (!username || !fullName || !password) {
    res.status(400).json({ error: "Username, full name, and password are required." });
    return;
  }

  try {
    const passwordHash = await hashPassword(password);
    let employeeId = generateEmployeeId();

    // Ensure uniqueness (retry up to 5 times)
    for (let i = 0; i < 5; i++) {
      const [existing] = await db
        .select({ id: receptionistsTable.id })
        .from(receptionistsTable)
        .where(eq(receptionistsTable.employeeId, employeeId))
        .limit(1);
      if (!existing) break;
      employeeId = generateEmployeeId();
    }

    const [created] = await db
      .insert(receptionistsTable)
      .values({
        employeeId,
        username,
        fullName,
        mobile: mobile ?? null,
        email: email ?? null,
        passwordHash,
        role: (role as "receptionist" | "cashier" | "admin") ?? "receptionist",
        status: "active",
      })
      .returning();

    await db.insert(auditLogsTable).values({
      receptionistId: created.id,
      action: "account_created",
      details: `Created by admin`,
    });

    res.status(201).json({
      id: created.id,
      employeeId: created.employeeId,
      username: created.username,
      fullName: created.fullName,
      role: created.role,
      status: created.status,
    });
  } catch (err: any) {
    if (err?.constraint?.includes("username")) {
      res.status(409).json({ error: "Username already exists." });
    } else {
      res.status(500).json({ error: "Failed to create account." });
    }
  }
});

// PATCH /api/receptionists/:id
router.patch("/receptionists/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { fullName, mobile, email, role, status } = req.body as {
    fullName?: string;
    mobile?: string;
    email?: string;
    role?: string;
    status?: string;
  };

  try {
    const [updated] = await db
      .update(receptionistsTable)
      .set({
        ...(fullName && { fullName }),
        ...(mobile !== undefined && { mobile }),
        ...(email !== undefined && { email }),
        ...(role && { role: role as "admin" | "receptionist" | "cashier" }),
        ...(status && { status: status as "active" | "inactive" }),
      })
      .where(eq(receptionistsTable.id, id))
      .returning({ id: receptionistsTable.id });

    if (!updated) {
      res.status(404).json({ error: "Receptionist not found." });
      return;
    }

    await db.insert(auditLogsTable).values({
      receptionistId: id,
      action: "account_updated",
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to update account." });
  }
});

// DELETE /api/receptionists/:id
router.delete("/receptionists/:id", async (req, res) => {
  const id = Number(req.params.id);
  // Protect the built-in admin account
  const [target] = await db
    .select({ employeeId: receptionistsTable.employeeId })
    .from(receptionistsTable)
    .where(eq(receptionistsTable.id, id))
    .limit(1);

  if (target?.employeeId === "ADMIN001") {
    res.status(403).json({ error: "Cannot delete the default admin account." });
    return;
  }

  try {
    await db.delete(receptionistsTable).where(eq(receptionistsTable.id, id));
    await db.insert(auditLogsTable).values({
      action: "account_deleted",
      details: `Deleted receptionist id ${id}`,
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete account." });
  }
});

// POST /api/receptionists/:id/reset-password
router.post("/receptionists/:id/reset-password", async (req, res) => {
  const id = Number(req.params.id);
  const { newPassword } = req.body as { newPassword?: string };
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters." });
    return;
  }
  try {
    const passwordHash = await hashPassword(newPassword);
    await db
      .update(receptionistsTable)
      .set({ passwordHash, passwordResetToken: null, passwordResetExpiry: null })
      .where(eq(receptionistsTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to reset password." });
  }
});

export default router;
