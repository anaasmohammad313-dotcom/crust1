// Builds the Supabase Postgres connection string from discrete parts (host/port/project
// ref are plain env vars, password is a secret) to avoid manual URL copy/paste errors.
export function buildSupabaseUrl(): string | undefined {
  const password = process.env.SUPABASE_DB_PASSWORD;
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const host = process.env.SUPABASE_DB_HOST;
  const port = process.env.SUPABASE_DB_PORT || "6543";

  if (!password || !projectRef || !host) return undefined;

  const encodedPassword = encodeURIComponent(password);
  // Supabase's pooler uses a cert chain that fails full verification from this
  // environment; `no-verify` still encrypts the connection but skips cert validation,
  // matching the `rejectUnauthorized: false` option used by the runtime pg.Pool below.
  return `postgresql://postgres.${projectRef}:${encodedPassword}@${host}:${port}/postgres?pgbouncer=true&sslmode=no-verify`;
}
