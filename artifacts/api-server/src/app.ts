import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Reflect origin and allow credentials (required for session cookies)
app.use(cors({ origin: true, credentials: true }));
// Higher limit to accommodate base64-encoded menu item images.
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));

const SESSION_SECRET = process.env["SESSION_SECRET"];
if (!SESSION_SECRET) throw new Error("SESSION_SECRET environment variable is required");

const isProduction = process.env["NODE_ENV"] === "production";

// In production use PostgreSQL-backed sessions so they survive serverless cold starts.
// In development fall back to the default MemoryStore (no extra setup needed).
const PgStore = connectPgSimple(session);
const sessionStore = isProduction
  ? new PgStore({ pool, tableName: "session", createTableIfMissing: true })
  : undefined;

app.use(
  session({
    store: sessionStore,
    name: "pos.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,   // HTTPS on Vercel, plain HTTP on Replit dev
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
  }),
);

app.use("/api", router);

// Centralized error handler — must have 4 params for Express to treat it as an error middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error({ err }, "Unhandled request error");
  res.status(500).json({ error: message });
});

export default app;
