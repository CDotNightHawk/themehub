# themehub

> Theme everything.

A community-built, self-hostable hub for themes — every layer of your stack:
GRUB, rEFInd, systemd-boot, Ventoy, Plymouth, SDDM, GDM, GTK, KDE/Plasma,
icon and cursor packs, wallpapers, terminals, VS Code, Firefox, sticker art,
hardware mod templates, and a generic "other" bucket for everything else.

There is a web app (Next.js + Postgres), a public REST API, and a Rust CLI
(`themehub`) for installing themes from any hub. Run a public instance for
your community, run a tiny private one for your friend group, or just point
the CLI at someone else's hub.

## Why

> "I want to theme all my stuff, from OS, to bootloader, to Ventoy and USBs,
> to stickers I put around, what hardware I have, equipment. Issue is, themes
> are hard to come by."

Every layer of the stack has its own format and registry. themehub is one
place that knows how to validate, host, and install all of them.

## Repo layout

```
.
├── web/        Next.js 16 app (TypeScript, Tailwind, Drizzle, Postgres, Auth.js)
├── cli/        Rust CLI (`themehub search`, `install`, `login`, …)
├── nix/        NixOS module
├── flake.nix   Nix flake (devShell + cli package + nixosModules.default)
├── examples/   Reference themes used to seed a fresh instance
├── docs/       Manifest spec, API reference, self-hosting guide
└── docker-compose.yml
```

## Quick start (self-host)

```bash
git clone https://github.com/CDotNightHawk/themehub
cd themehub
cp .env.example .env
# edit .env — at minimum set AUTH_SECRET and ADMIN_USERS
docker compose up -d
```

Visit <http://localhost:3000>. The first user listed in `ADMIN_USERS` who
signs up gets the admin bit automatically.

To seed a fresh instance with the example themes from `examples/`:

```bash
docker compose exec web npm run db:seed
```

For NixOS:

```nix
# flake.nix
{
  inputs.themehub.url = "github:CDotNightHawk/themehub";
  outputs = { self, nixpkgs, themehub }: {
    nixosConfigurations.myhost = nixpkgs.lib.nixosSystem {
      modules = [
        themehub.nixosModules.default
        { services.themehub = {
            enable = true;
            domain = "themes.example.com";
            adminUsers = [ "you@example.com" ];
          };
        }
      ];
    };
  };
}
```

Full guide: [docs/self-hosting.md](docs/self-hosting.md).

## CLI

```bash
themehub login
themehub search furry grub
themehub install furry-grub-dark
themehub install ventoy-paws --target ~/ventoy/themes/ventoy-paws
themehub list
themehub categories
```

Build it yourself with `cargo build --release` from `cli/`, or grab it via
`nix run github:CDotNightHawk/themehub#cli -- search ventoy`.

## Theme manifest

Every theme is a zip archive with a `theme.toml` at its root. Minimal example:

```toml
[theme]
name = "Furry GRUB Dark"
slug = "furry-grub-dark"
type = "grub"
version = "1.0.0"
license = "CC-BY-SA-4.0"
description = "A dark GRUB theme with paw prints and neon accents."
authors = ["NightHawk"]
tags = ["furry", "dark", "neon"]

[install]
target = "/boot/grub/themes/furry-grub-dark"
entrypoint = "theme.txt"
```

Full spec: [docs/theme-spec.md](docs/theme-spec.md).

## API

Public, versioned, JSON. Read endpoints are anonymous; write endpoints take
a Bearer token from `/settings/tokens`.

```
GET    /api/v1/themes?q=&type=&tag=&sort=&limit=&offset=
GET    /api/v1/themes/{slug}
GET    /api/v1/themes/{slug}/versions/{version}/archive
POST   /api/v1/themes
GET    /api/v1/categories
GET    /api/v1/me
```

Full reference: [docs/api.md](docs/api.md).

## Development

```bash
docker compose up -d postgres minio        # only the deps
cd web
npm install
cp ../.env.example .env.local
npm run db:push
npm run db:seed
npm run dev                                # http://localhost:3000

# CLI
cd ../cli
cargo run -- --hub http://localhost:3000 search furry
```

The Nix flake provides a devShell with everything needed:

```bash
nix develop
```

## License

MIT for the code. Themes uploaded to the hub keep their own licenses
(declared in `theme.toml`).
