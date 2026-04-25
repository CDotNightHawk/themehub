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

The authoritative list lives in [`web/src/lib/categories.ts`](../web/src/lib/categories.ts)
and is exposed to clients at `/api/v1/categories`. Every type below is accepted
by the manifest parser.

**Boot**

| `type`         | Default install target                   |
|----------------|------------------------------------------|
| `grub`         | `/boot/grub/themes/{slug}`               |
| `refind`       | `/boot/EFI/refind/themes/{slug}`         |
| `systemd-boot` | `/boot/loader/themes/{slug}`             |
| `ventoy`       | `{home}/ventoy/themes/{slug}`            |
| `plymouth`     | `/usr/share/plymouth/themes/{slug}`      |

**Desktop & login**

| `type`       | Default install target                              |
|--------------|-----------------------------------------------------|
| `sddm`       | `/usr/share/sddm/themes/{slug}`                     |
| `gdm`        | `/usr/share/gnome-shell/theme/{slug}`               |
| `lightdm`    | `/usr/share/lightdm-webkit/themes/{slug}`           |
| `gtk`        | `{home}/.themes/{slug}`                             |
| `kde-plasma` | `{home}/.local/share/plasma/desktoptheme/{slug}`    |
| `xfce`       | `{home}/.themes/{slug}`                             |
| `cinnamon`   | `{home}/.themes/{slug}`                             |
| `mate`       | `{home}/.themes/{slug}`                             |

**Window managers (ricing)**

`hyprland`, `sway`, `niri`, `i3`, `bspwm`, `awesome`, `xmonad`, `openbox`,
`river`, `dwm`, `qtile`. Default target is
`{home}/.config/<wm>/themes/{slug}`.

**Bars, launchers, notifications**

`waybar`, `polybar`, `eww`, `rofi`, `wofi`, `dmenu`, `mako`, `dunst`.
Default target is `{home}/.config/<tool>/themes/{slug}`.

**Icons, cursors, wallpapers**

| `type`                | Default install target                |
|-----------------------|---------------------------------------|
| `icon`                | `{home}/.icons/{slug}`                |
| `cursor`              | `{home}/.icons/{slug}`                |
| `wallpaper`           | `{home}/Pictures/Wallpapers/{slug}`   |
| `wallpaper-animated`  | `{home}/Pictures/Wallpapers/{slug}`   |

**Terminals, shells, editors**

`terminal`, `alacritty`, `kitty`, `wezterm`, `foot`, `ghostty`, `tmux`,
`neovim`, `helix`, `emacs`, `fastfetch`, `neofetch`, `starship`, `zellij`.
Default targets live under `{home}/.config/<tool>/themes/{slug}` (see
`categories.ts` for exact paths).

**Apps**

`vscode`, `jetbrains`, `sublime`, `firefox`, `chrome`, `discord`, `telegram`,
`spicetify`, `obsidian`, `vesktop`, `obs`, `conky`. Per-app defaults.

**Mini screens**

`mini-screen`, `streamdeck`, `turing-smart-screen`, `aida64` — layout assets
for external displays (3.5" USB panels, Stream Decks, AIDA64 SensorPanels).

**Physical**

`sticker`, `hardware`, `keycap` — print-ready SVG / PDF / STL assets.

**Fallback**

`other` — `{home}/.local/share/themehub/{slug}`.

The CLI may override any default via `themehub install --target ...`.
`themehub categories` prints the live list from the hub.

## Archive format

- ZIP recommended. `tar.gz`, `tar.zst`, and `7z` are accepted.
- The manifest MUST live at the archive root as `theme.toml`.
- Maximum archive size: 50 MB by default (configurable per instance).
- Filenames must be UTF-8. Path traversal (`..`) is rejected at upload time.

## Versioning

Each upload is a new immutable **version**. Semver is enforced — you cannot
upload a version that is `<=` the previously published one for a given slug.
