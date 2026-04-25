# Testing the themehub app

Use this when verifying the web UI / public API / Rust CLI end-to-end.

## Stack at a glance
- `web/` Next.js 16 (App Router, production build works with `npm run start`).
- `cli/` Rust binary at `cli/target/release/themehub` after `cargo build --release`.
- Postgres 16 + local-FS storage are enough for everything except the S3 driver.

## Bring up locally
```bash
docker start themehub-pg 2>/dev/null || docker run -d --name themehub-pg -p 5432:5432 \
  -e POSTGRES_USER=themehub -e POSTGRES_PASSWORD=themehub -e POSTGRES_DB=themehub \
  postgres:16-alpine

cd web
DATABASE_URL=postgres://themehub:themehub@localhost:5432/themehub npx drizzle-kit push --force
DATABASE_URL=postgres://themehub:themehub@localhost:5432/themehub \
AUTH_SECRET=devsecretdevsecretdevsecretdevsecret \
STORAGE_DRIVER=local STORAGE_LOCAL_DIR=./storage \
ADMIN_USERS=nighthawk@nanofox.dev \
npm run db:seed   # idempotent; skips if versions already exist

DATABASE_URL=... AUTH_SECRET=... PUBLIC_URL=http://localhost:3000 AUTH_URL=http://localhost:3000 \
STORAGE_DRIVER=local STORAGE_LOCAL_DIR=./storage ADMIN_USERS=nighthawk@nanofox.dev \
npm run start
```

Seeded test account: `nighthawk@nanofox.dev` / `themehubdemo` (configured via `ADMIN_USERS` + the seed script; see `web/src/db/seed.ts`).

## Primary test flow
1. `/` — expect hero "Theme everything." + 3 seeded themes (furry-grub-dark, ventoy-paws, gtk-night-paws).
2. Click a theme, verify README/Versions/Install target render.
3. Sign in — header flips to Upload / @nighthawk / admin / Sign out.
4. Post comment and 4★ — top-of-page rating shows `4.0 (1)`; sidebar reads "you rated 4★".
5. Upload via `/themes/new` — see **Gotchas** below for the manifest format.
6. Re-upload same version — expect `version X.Y.Z must be greater than X.Y.Z`.
7. Generate API token at `/settings/tokens`, then `themehub --hub http://localhost:3000 login --token <t>` + `search` + `install --target /tmp/... -y`.

## Gotchas
- **theme.toml must use `[theme]` and `[install]` tables, not root keys.** The Zod schema is `z.object({ theme: z.object({...}), install: z.object({...}).optional() })`. A flat manifest fails with `theme: Invalid input: expected object, received undefined`. See `examples/themes/furry-grub-dark/theme.toml` as the canonical shape.
- **Downloads counter may increment on page renders** (observed `1 → 3 → 5 → 7` across loads without clicking Download). Re-verify the download counter logic when next testing.
- **File chooser via Chrome headed:** Clicking the upload dropzone opens a GTK file dialog. From the computer/xdotool side, press Ctrl+L in the dialog to get a "Location" bar, then type the absolute path and Enter. Works for any `<input type="file">`.
- **Next.js 16 breaking changes** — `params`/`searchParams` are Promises, `middleware.ts` is `proxy.ts`. Read `web/node_modules/next/dist/docs/01-app/` before changing routes.
- **Archive formats supported:** zip, tar.gz, tar.zst. Archive must contain `theme.toml` at its root (not nested inside a folder).

## Useful paths
- Upload form: `web/src/app/themes/new/upload-form.tsx`
- Server upload handler: `web/src/server/themes.ts`
- Manifest parser + schema: `web/src/lib/theme-spec.ts`
- Storage abstraction: `web/src/lib/storage.ts`
- CLI source: `cli/src/main.rs`
- CLI config file: `~/.config/themehub/config.toml`

## Devin Secrets Needed
None for the local flow above. For OAuth testing you'd need `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`. For S3 driver testing you'd need `S3_ENDPOINT` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_BUCKET`.
