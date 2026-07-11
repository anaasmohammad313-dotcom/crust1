import { Router } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@workspace/db";
import { receptionistsTable, auditLogsTable } from "@workspace/db/schema";
import { verifyPassword, hashPassword, generateResetToken } from "../lib/auth-utils";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function getIp(req: import("express").Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown"
  );
}

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  const { login, password, rememberMe } = req.body as {
    login?: string;
    password?: string;
    rememberMe?: boolean;
  };
  const ip = getIp(req as any);

  if (!login || !password) {
    res.status(400).json({ error: "Username/Employee ID and password are required." });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(receptionistsTable)
      .where(
        // match by username OR employee ID
        eq(receptionistsTable.username, login),
      )
      .limit(1);

    // also try employeeId if username lookup missed
    const receptionist =
      user ??
      (
        await db
          .select()
          .from(receptionistsTable)
          .where(eq(receptionistsTable.employeeId, login))
          .limit(1)
      )[0];

    if (!receptionist) {
      await db.insert(auditLogsTable).values({
        action: "login_failed",
        ipAddress: ip,
        details: `Unknown login: ${login}`,
      });
      res.status(401).json({ error: "Invalid Username/Employee ID or Password." });
      return;
    }

    if (receptionist.status === "inactive") {
      res.status(403).json({ error: "This account is disabled. Contact your administrator." });
      return;
    }

    const valid = await verifyPassword(password, receptionist.passwordHash);
    if (!valid) {
      await db.insert(auditLogsTable).values({
        receptionistId: receptionist.id,
        action: "login_failed",
        ipAddress: ip,
        details: "Wrong password",
      });
      res.status(401).json({ error: "Invalid Username/Employee ID or Password." });
      return;
    }

    // Extend session if rememberMe
    if (rememberMe) {
      req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    }

    // Regenerate the session ID to prevent session fixation attacks
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });

    req.session.receptionist = {
      id: receptionist.id,
      employeeId: receptionist.employeeId,
      username: receptionist.username,
      fullName: receptionist.fullName,
      role: receptionist.role as "admin" | "receptionist" | "cashier",
    };

    // Update last login
    await db
      .update(receptionistsTable)
      .set({ lastLogin: new Date() })
      .where(eq(receptionistsTable.id, receptionist.id));

    await db.insert(auditLogsTable).values({
      receptionistId: receptionist.id,
      action: "login",
      ipAddress: ip,
    });

    res.json({
      id: receptionist.id,
      employeeId: receptionist.employeeId,
      username: receptionist.username,
      fullName: receptionist.fullName,
      role: receptionist.role,
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// POST /api/auth/logout
router.post("/auth/logout", requireAuth, async (req, res) => {
  const r = req.session.receptionist!;
  const ip = getIp(req as any);

  await db.insert(auditLogsTable).values({
    receptionistId: r.id,
    action: "logout",
    ipAddress: ip,
  }).catch(() => undefined);

  req.session.destroy(() => {
    res.clearCookie("pos.sid");
    res.json({ ok: true });
  });
});

// GET /api/auth/me
router.get("/auth/me", (req, res) => {
  if (!req.session.receptionist) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(req.session.receptionist);
});

// POST /api/auth/forgot-password
router.post("/auth/forgot-password", async (req, res) => {
  const { login } = req.body as { login?: string };
  if (!login) {
    res.status(400).json({ error: "Username or Employee ID is required." });
    return;
  }

  try {
    const [byUsername] = await db
      .select()
      .from(receptionistsTable)
      .where(eq(receptionistsTable.username, login))
      .limit(1);
    const receptionist =
      byUsername ??
      (
        await db
          .select()
          .from(receptionistsTable)
          .where(eq(receptionistsTable.employeeId, login))
          .limit(1)
      )[0];

    if (!receptionist) {
      // Return same response to avoid user enumeration
      res.json({ ok: true, message: "If that account exists, a reset token has been generated." });
      return;
    }

    const token = generateResetToken();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db
      .update(receptionistsTable)
      .set({ passwordResetToken: token, passwordResetExpiry: expiry })
      .where(eq(receptionistsTable.id, receptionist.id));

    await db.insert(auditLogsTable).values({
      receptionistId: receptionist.id,
      action: "password_reset",
      ipAddress: getIp(req),
      details: "Reset token generated",
    });

    // Token is stored in the DB — admin resets the password via Employee Management.
    // Never expose the raw token over HTTP to prevent account takeover.
    res.json({
      ok: true,
      message: "Request received. Please ask your administrator to reset your password via the Employee Management page.",
    });
  } catch {
    res.status(500).json({ error: "Failed to generate reset token." });
  }
});

// POST /api/auth/reset-password
router.post("/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };
  if (!token || !newPassword) {
    res.status(400).json({ error: "Token and new password are required." });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  try {
    const [receptionist] = await db
      .select()
      .from(receptionistsTable)
      .where(
        and(
          eq(receptionistsTable.passwordResetToken, token),
          gt(receptionistsTable.passwordResetExpiry, new Date()),
        ),
      )
      .limit(1);

    if (!receptionist) {
      res.status(400).json({ error: "Invalid or expired reset token." });
      return;
    }

    const passwordHash = await hashPassword(newPassword);
    await db
      .update(receptionistsTable)
      .set({ passwordHash, passwordResetToken: null, passwordResetExpiry: null })
      .where(eq(receptionistsTable.id, receptionist.id));

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to reset password." });
  }
});

export default router;
