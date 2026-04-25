# Theme manifest specification (`theme.toml`)

Every theme uploaded to themehub MUST contain a `theme.toml` file at the root of
the archive. The manifest tells the platform — and the `themehub` CLI — what the
theme is, where it should be installed, and how it relates to other content.

## Minimal example

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
nsfw = false

[install]
target = "/boot/grub/themes/furry-grub-dark"
entrypoint = "theme.txt"
```

## Schema

### `[theme]` — required

| Field         | Type             | Description                                                                  |
|---------------|------------------|------------------------------------------------------------------------------|
| `name`        | string           | Human-readable name.                                                         |
| `slug`        | string (`a-z0-9-`)| URL slug. Must be unique on a given hub.                                    |
| `type`        | enum (see below) | Theme category. Determines default install location and validators.          |
| `version`     | semver string    | Semantic version of this release.                                            |
| `license`     | SPDX id          | e.g. `MIT`, `CC-BY-SA-4.0`, `GPL-3.0-or-later`.                              |
| `description` | string           | One-paragraph summary. Markdown allowed.                                     |
| `authors`     | string[]         | One or more author names.                                                    |
| `tags`        | string[]         | Free-form tags. Lowercased, deduplicated server-side.                        |
| `nsfw`        | bool             | Optional. Defaults to `false`. NSFW themes are hidden behind a user toggle.  |
| `homepage`    | string (URL)     | Optional. External project page.                                             |
| `repository`  | string (URL)     | Optional. Source repo.                                                       |
| `screenshots` | string[]         | Optional. Paths inside the archive to use as gallery images.                 |
| `readme`      | string           | Optional. Path inside the archive to a markdown file (default `README.md`).  |

### `[install]` — optional but recommended

| Field        | Type     | Description                                                                  |
|--------------|----------|------------------------------------------------------------------------------|
| `target`     | string   | Default install path. May contain `{slug}` and `{home}` placeholders.        |
| `entrypoint` | string   | Path inside the archive that should be the "main" file (e.g. `theme.txt`).   |
| `pre`        | string[] | Optional shell commands run before install (advanced; opt-in via CLI flag).  |
| `post`       | string[] | Optional shell commands run after install (advanced; opt-in via CLI flag).   |

### Supported `type` values

| `type`           | Default install target                          |
|------------------|-------------------------------------------------|
| `grub`           | `/boot/grub/themes/{slug}`                      |
| `refind`         | `/boot/EFI/refind/themes/{slug}`                |
| `systemd-boot`   | `/boot/loader/themes/{slug}`                    |
| `ventoy`         | `{home}/ventoy/themes/{slug}`                   |
| `plymouth`       | `/usr/share/plymouth/themes/{slug}`             |
| `sddm`           | `/usr/share/sddm/themes/{slug}`                 |
| `gdm`            | `/usr/share/gnome-shell/theme/{slug}`           |
| `gtk`            | `{home}/.themes/{slug}`                         |
| `kde-plasma`     | `{home}/.local/share/plasma/desktoptheme/{slug}`|
| `icon`           | `{home}/.icons/{slug}`                          |
| `cursor`         | `{home}/.icons/{slug}` (cursor variant)         |
| `wallpaper`      | `{home}/Pictures/Wallpapers/{slug}`             |
| `terminal`       | `{home}/.config/themehub/terminal/{slug}`       |
| `vscode`         | `{home}/.vscode/extensions/{slug}`              |
| `firefox`        | n/a — installed via the manifest's `homepage`   |
| `sticker`        | `{home}/Pictures/Stickers/{slug}`               |
| `hardware`       | n/a — printable assets / 3D files               |
| `other`          | `{home}/.local/share/themehub/{slug}`           |

The CLI may override any default via `themehub install --target ...`.

## Archive format

- ZIP recommended. `tar.gz`, `tar.zst`, and `7z` are accepted.
- The manifest MUST live at the archive root as `theme.toml`.
- Maximum archive size: 50 MB by default (configurable per instance).
- Filenames must be UTF-8. Path traversal (`..`) is rejected at upload time.

## Versioning

Each upload is a new immutable **version**. Semver is enforced — you cannot
upload a version that is `<=` the previously published one for a given slug.
