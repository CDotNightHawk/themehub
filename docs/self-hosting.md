# Self-hosting themehub

themehub is designed to run comfortably on a single small server.

## Option 1 — `docker-compose` (simplest)

```bash
git clone https://github.com/CDotNightHawk/themehub
cd themehub
cp .env.example .env
$EDITOR .env  # set AUTH_SECRET, PUBLIC_URL, ADMIN_USERS
docker compose up -d
```

This brings up:

- `web` — the Next.js app on port `3000`
- `postgres` — Postgres 16
- `minio` — S3-compatible object storage on `9000` (console on `9001`)
- `clamav` — ClamAV daemon that every upload is streamed to for virus
  scanning (port `3310`). Signatures refresh automatically via `freshclam`
  inside the image.
- `migrate` — one-shot that runs `drizzle-kit push` so the schema is ready
- `minio-init` — one-shot that creates the `themehub` bucket on first boot

Schema migrations and bucket creation run automatically, so `docker compose up -d`
is enough for a fresh install.

> **ClamAV first-start:** on a cold start, the `clamav` service needs a few
> minutes to download virus signatures before it can accept scans. The web
> service is still reachable in the meantime; uploads during that window
> are recorded with `verdict: skipped` and allowed through. Once clamd is
> ready you'll see `verdict: clean`/`infected` rows appear in
> `/admin` → Upload scans. Set `CLAMAV_DISABLED=1` in `.env` to opt out
> entirely.

Optionally load the example themes:

```bash
docker compose exec web npm run db:seed
```

Open <http://localhost:3000> and register the first user. If their email matches
`ADMIN_USERS` in `.env`, they automatically get admin powers.

## Option 2 — Nix / NixOS

The repo exposes a flake with a NixOS module:

```nix
{
  inputs.themehub.url = "github:CDotNightHawk/themehub";
  outputs = { self, nixpkgs, themehub, ... }: {
    nixosConfigurations.my-host = nixpkgs.lib.nixosSystem {
      modules = [
        themehub.nixosModules.default
        {
          services.themehub = {
            enable = true;
            domain = "themes.example.com";
            adminUsers = [ "nighthawk@example.com" ];
          };
        }
      ];
    };
  };
}
```

The module provisions a `postgresql` database, persistent storage under
`/var/lib/themehub`, and a systemd unit for the web app.

## Option 3 — Bare metal / manual

Requirements: Node 20+, Postgres 14+, S3-compatible storage (or local FS).

```bash
cd web
npm ci
npm run build
DATABASE_URL=... AUTH_SECRET=... npm run start
```

## GitHub OAuth (optional)

To let users sign in with GitHub:

1. Create a new OAuth app at
   <https://github.com/settings/applications/new>.
   - **Homepage URL**: your `PUBLIC_URL` (e.g. `https://themes.example.com`)
   - **Authorization callback URL**: `<PUBLIC_URL>/api/auth/callback/github`
     (e.g. `https://themes.example.com/api/auth/callback/github`, or
     `http://localhost:3000/api/auth/callback/github` for local testing).
2. Copy the client ID and generate a client secret.
3. Set them in `.env`:

   ```bash
   GITHUB_CLIENT_ID=Iv1.abc...
   GITHUB_CLIENT_SECRET=...
   ```

4. Restart the web service (`docker compose up -d web`).

The login and register pages automatically show a "Continue with GitHub" button
whenever `GITHUB_CLIENT_ID` is set; if it's blank, only credentials login is
offered. OAuth users get a username auto-generated from their GitHub name on
first sign-in.

## Going public

When you're ready to expose the instance:

1. Put it behind a reverse proxy (Caddy / nginx / Traefik) with HTTPS.
2. Set `PUBLIC_URL` and `AUTH_URL` to the public origin.
3. Configure `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` if you want OAuth
   (see section above).
4. Decide on `ALLOW_REGISTRATION` — set to `false` to make the instance
   invite-only.
5. Mention your instance in the [public hubs list](https://github.com/CDotNightHawk/themehub/blob/main/docs/public-hubs.md)
   so users can find it from the CLI.
