# Crust - The Street Food (Restaurant POS)

A point-of-sale app for a street food restaurant: take orders, track order history, and manage settings, backed by an Express API and Postgres.

## Run & Operate

- Two workflows run in dev: `API Server` (Express, `PORT=3001`) and `POS` (Vite dev server, `PORT=5000`, proxies `/api/*` to the API server via `API_PORT`). The `POS` workflow is what's shown in the Replit preview.
- `pnpm --filter @workspace/api-server run dev` — run the API server standalone (needs `PORT` env var)
- `pnpm --filter @workspace/pos run dev` — run the frontend standalone (needs `PORT` + `API_PORT` env vars)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session cookie signing secret
- Default seeded accounts (created on first API server start): `admin` / `Admin@123` (role: admin), `crust` (see `seedCrustUserIfNeeded` for its password)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

- POS frontend (`artifacts/pos`) branded with the "Crust - The Street Food" logo in the sidebar (`src/assets/logo.png`).
- Payment methods on the order flow: Cash, UPI, Card.
- Order history page tracks order status including "Pending".
- Menu Editor (`/menu`, admin only): manage categories (add/rename/reorder/delete) and items (add/rename/reprice/enable-disable/delete). Each item can also have an optional image — uploaded via file picker, stored as a base64 data URL in `menu_items.image_url`, removable independently of the item itself.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Menu item images are stored inline as base64 data URLs (no object storage / multipart upload wired up); keep uploads small (client enforces a 2MB cap) since they bloat the Postgres row and JSON payloads.
- `express.json`/`urlencoded` body limit is raised to 8mb in `artifacts/api-server/src/app.ts` to accommodate those image payloads.
- `artifacts/api-server/src/routes/orders.ts` and `artifacts/pos/src/pages/take-order.tsx` reference a `paymentSplits` field that doesn't exist in the OpenAPI spec/schema yet — pre-existing from the import, causes `pnpm run typecheck` to fail. Unrelated to the menu editor; needs its own fix.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
