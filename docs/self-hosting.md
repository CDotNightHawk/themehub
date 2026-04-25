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

The first time it starts, run migrations + seed:

```bash
docker compose exec web npm run db:push
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

## Going public

When you're ready to expose the instance:

1. Put it behind a reverse proxy (Caddy / nginx / Traefik) with HTTPS.
2. Set `PUBLIC_URL` and `AUTH_URL` to the public origin.
3. Configure `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` if you want OAuth.
4. Decide on `ALLOW_REGISTRATION` — set to `false` to make the instance
   invite-only.
5. Mention your instance in the [public hubs list](https://github.com/CDotNightHawk/themehub/blob/main/docs/public-hubs.md)
   so users can find it from the CLI.
