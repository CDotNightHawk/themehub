# Repo notes for future Devin sessions

## Stack
- `web/`: Next.js 16 (App Router) + TypeScript + Tailwind v4 + Drizzle ORM + Postgres + Auth.js v5.
- `cli/`: Rust binary using `clap`, `reqwest`, `serde`, `toml`.
- `nix/`: flake outputs (devShell, package, NixOS module).

## Commands
- `cd web && npm run dev` — start dev server (requires Postgres on `DATABASE_URL`).
- `cd web && npm run build` — production build.
- `cd web && npm run lint` — eslint.
- `cd web && npm run db:push` — push Drizzle schema to DB.
- `cd web && npm run db:seed` — seed categories + demo data.
- `cd cli && cargo build --release` — build CLI.

## Important
- Next.js 16 has breaking changes vs older Next docs. `params`/`searchParams` are
  Promises; `middleware.ts` is now `proxy.ts`. Read
  `web/node_modules/next/dist/docs/01-app/` before changing routing.
- Database schema lives in `web/src/db/schema.ts`. Update there and run `db:push`.
- Theme manifest: see `docs/theme-spec.md`. Parser is `web/src/lib/theme-spec.ts`.
- Storage abstraction is `web/src/lib/storage.ts` — local FS for dev, S3 for prod.
  Choose via `STORAGE_DRIVER=local|s3`.
- Auth uses Auth.js v5 with credentials + GitHub providers. Config in
  `web/src/lib/auth.ts`.

## Conventions
- Server-only code goes under `web/src/server/` or `web/src/lib/` and must not
  be imported from client components.
- Routes under `web/src/app/api/v1/` are the **public API** — versioned and used
  by the CLI. Don't break them without bumping the version.
