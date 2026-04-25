// Single source of truth for the supported theme types.
// Mirrors `docs/theme-spec.md`.

export type ThemeType =
  // boot
  | "grub"
  | "refind"
  | "systemd-boot"
  | "ventoy"
  | "plymouth"
  // desktop / login / DE
  | "sddm"
  | "gdm"
  | "lightdm"
  | "gtk"
  | "kde-plasma"
  | "xfce"
  | "cinnamon"
  | "mate"
  // wm / ricing
  | "hyprland"
  | "sway"
  | "niri"
  | "i3"
  | "bspwm"
  | "awesome"
  | "xmonad"
  | "openbox"
  | "river"
  | "dwm"
  | "qtile"
  // bars / launchers / notifications
  | "waybar"
  | "polybar"
  | "eww"
  | "rofi"
  | "wofi"
  | "dmenu"
  | "mako"
  | "dunst"
  // iconography & pointers
  | "icon"
  | "cursor"
  // wallpapers & media
  | "wallpaper"
  | "wallpaper-animated"
  // terminals & shells
  | "terminal"
  | "alacritty"
  | "kitty"
  | "wezterm"
  | "foot"
  | "ghostty"
  | "tmux"
  | "neovim"
  | "helix"
  | "emacs"
  | "fastfetch"
  | "neofetch"
  | "starship"
  | "zellij"
  // editors / apps
  | "vscode"
  | "jetbrains"
  | "sublime"
  | "firefox"
  | "chrome"
  | "discord"
  | "telegram"
  | "spicetify"
  | "obsidian"
  | "vesktop"
  | "obs"
  | "conky"
  // mini screens / external displays
  | "mini-screen"
  | "streamdeck"
  | "turing-smart-screen"
  | "aida64"
  // physical / fun
  | "sticker"
  | "hardware"
  | "keycap"
  | "other";

export interface Category {
  type: ThemeType;
  label: string;
  group:
    | "boot"
    | "desktop"
    | "ricing"
    | "bars"
    | "media"
    | "terminal"
    | "apps"
    | "mini-screen"
    | "physical";
  defaultTarget: string;
  blurb: string;
  /** Emoji shown in the category grid / badge. */
  icon: string;
}

export const CATEGORIES: Category[] = [
  // -------- boot --------
  {
    type: "grub",
    label: "GRUB",
    group: "boot",
    defaultTarget: "/boot/grub/themes/{slug}",
    blurb: "Bootloader splash and menu themes for GRUB.",
    icon: "🐚",
  },
  {
    type: "refind",
    label: "rEFInd",
    group: "boot",
    defaultTarget: "/boot/EFI/refind/themes/{slug}",
    blurb: "Boot-manager themes for the rEFInd bootloader.",
    icon: "🧿",
  },
  {
    type: "systemd-boot",
    label: "systemd-boot",
    group: "boot",
    defaultTarget: "/boot/loader/themes/{slug}",
    blurb: "Themes for the systemd-boot loader.",
    icon: "🧷",
  },
  {
    type: "ventoy",
    label: "Ventoy",
    group: "boot",
    defaultTarget: "{home}/ventoy/themes/{slug}",
    blurb: "Backgrounds and theme.txt files for Ventoy USBs.",
    icon: "💽",
  },
  {
    type: "plymouth",
    label: "Plymouth",
    group: "boot",
    defaultTarget: "/usr/share/plymouth/themes/{slug}",
    blurb: "Animated boot-splash themes.",
    icon: "🌊",
  },

  // -------- desktop / login / DE --------
  {
    type: "sddm",
    label: "SDDM",
    group: "desktop",
    defaultTarget: "/usr/share/sddm/themes/{slug}",
    blurb: "Login-screen themes for the SDDM display manager.",
    icon: "🔐",
  },
  {
    type: "gdm",
    label: "GDM",
    group: "desktop",
    defaultTarget: "/usr/share/gnome-shell/theme/{slug}",
    blurb: "GNOME login-screen themes.",
    icon: "🔑",
  },
  {
    type: "lightdm",
    label: "LightDM",
    group: "desktop",
    defaultTarget: "/usr/share/lightdm-webkit/themes/{slug}",
    blurb: "LightDM greeter themes.",
    icon: "💡",
  },
  {
    type: "gtk",
    label: "GTK",
    group: "desktop",
    defaultTarget: "{home}/.themes/{slug}",
    blurb: "GTK 3/4 desktop themes.",
    icon: "🪟",
  },
  {
    type: "kde-plasma",
    label: "KDE / Plasma",
    group: "desktop",
    defaultTarget: "{home}/.local/share/plasma/desktoptheme/{slug}",
    blurb: "Plasma desktop themes, look & feel packs.",
    icon: "🌀",
  },
  {
    type: "xfce",
    label: "XFCE",
    group: "desktop",
    defaultTarget: "{home}/.themes/{slug}",
    blurb: "XFWM / xfdesktop themes.",
    icon: "🦊",
  },
  {
    type: "cinnamon",
    label: "Cinnamon",
    group: "desktop",
    defaultTarget: "{home}/.themes/{slug}",
    blurb: "Cinnamon desktop themes.",
    icon: "🍰",
  },
  {
    type: "mate",
    label: "MATE",
    group: "desktop",
    defaultTarget: "{home}/.themes/{slug}",
    blurb: "Metacity / MATE desktop themes.",
    icon: "🫖",
  },

  // -------- ricing (window managers) --------
  {
    type: "hyprland",
    label: "Hyprland",
    group: "ricing",
    defaultTarget: "{home}/.config/hypr/themes/{slug}",
    blurb: "Hyprland configs, shaders, animations.",
    icon: "🌈",
  },
  {
    type: "sway",
    label: "Sway",
    group: "ricing",
    defaultTarget: "{home}/.config/sway/themes/{slug}",
    blurb: "Sway WM configs and styling.",
    icon: "🌿",
  },
  {
    type: "niri",
    label: "niri",
    group: "ricing",
    defaultTarget: "{home}/.config/niri/themes/{slug}",
    blurb: "niri scrolling-tile compositor configs.",
    icon: "📜",
  },
  {
    type: "i3",
    label: "i3",
    group: "ricing",
    defaultTarget: "{home}/.config/i3/themes/{slug}",
    blurb: "i3wm configs + palettes.",
    icon: "🧩",
  },
  {
    type: "bspwm",
    label: "bspwm",
    group: "ricing",
    defaultTarget: "{home}/.config/bspwm/themes/{slug}",
    blurb: "bspwm configs paired with sxhkd/polybar.",
    icon: "🔲",
  },
  {
    type: "awesome",
    label: "awesome",
    group: "ricing",
    defaultTarget: "{home}/.config/awesome/themes/{slug}",
    blurb: "awesomeWM themes (lua).",
    icon: "✨",
  },
  {
    type: "xmonad",
    label: "xmonad",
    group: "ricing",
    defaultTarget: "{home}/.xmonad/themes/{slug}",
    blurb: "xmonad configs.",
    icon: "🔶",
  },
  {
    type: "openbox",
    label: "Openbox",
    group: "ricing",
    defaultTarget: "{home}/.themes/{slug}/openbox-3",
    blurb: "Openbox window decorations.",
    icon: "📦",
  },
  {
    type: "river",
    label: "river",
    group: "ricing",
    defaultTarget: "{home}/.config/river/themes/{slug}",
    blurb: "river Wayland compositor configs.",
    icon: "🏞️",
  },
  {
    type: "dwm",
    label: "dwm",
    group: "ricing",
    defaultTarget: "{home}/.config/dwm/themes/{slug}",
    blurb: "Suckless dwm patch sets and configs.",
    icon: "🪡",
  },
  {
    type: "qtile",
    label: "Qtile",
    group: "ricing",
    defaultTarget: "{home}/.config/qtile/themes/{slug}",
    blurb: "Qtile (Python) configs + colours.",
    icon: "🐍",
  },

  // -------- bars / launchers / notifications --------
  {
    type: "waybar",
    label: "Waybar",
    group: "bars",
    defaultTarget: "{home}/.config/waybar/themes/{slug}",
    blurb: "Waybar status bar themes.",
    icon: "📊",
  },
  {
    type: "polybar",
    label: "Polybar",
    group: "bars",
    defaultTarget: "{home}/.config/polybar/themes/{slug}",
    blurb: "Polybar status bar themes.",
    icon: "📐",
  },
  {
    type: "eww",
    label: "EWW",
    group: "bars",
    defaultTarget: "{home}/.config/eww/themes/{slug}",
    blurb: "EWW widget themes and dashboards.",
    icon: "🪟",
  },
  {
    type: "rofi",
    label: "Rofi",
    group: "bars",
    defaultTarget: "{home}/.config/rofi/themes/{slug}",
    blurb: "Rofi launcher themes (.rasi).",
    icon: "🔎",
  },
  {
    type: "wofi",
    label: "Wofi",
    group: "bars",
    defaultTarget: "{home}/.config/wofi/themes/{slug}",
    blurb: "Wofi launcher themes.",
    icon: "🔍",
  },
  {
    type: "dmenu",
    label: "dmenu",
    group: "bars",
    defaultTarget: "{home}/.config/dmenu/themes/{slug}",
    blurb: "dmenu patches / palettes.",
    icon: "📝",
  },
  {
    type: "mako",
    label: "mako",
    group: "bars",
    defaultTarget: "{home}/.config/mako/themes/{slug}",
    blurb: "mako Wayland notification styling.",
    icon: "🔔",
  },
  {
    type: "dunst",
    label: "dunst",
    group: "bars",
    defaultTarget: "{home}/.config/dunst/themes/{slug}",
    blurb: "dunst notification styling.",
    icon: "📯",
  },

  // -------- iconography --------
  {
    type: "icon",
    label: "Icon pack",
    group: "media",
    defaultTarget: "{home}/.icons/{slug}",
    blurb: "Icon sets for any desktop environment.",
    icon: "🎨",
  },
  {
    type: "cursor",
    label: "Cursor pack",
    group: "media",
    defaultTarget: "{home}/.icons/{slug}",
    blurb: "Mouse cursor themes.",
    icon: "🖱️",
  },

  // -------- wallpapers / media --------
  {
    type: "wallpaper",
    label: "Wallpaper",
    group: "media",
    defaultTarget: "{home}/Pictures/Wallpapers/{slug}",
    blurb: "Static wallpapers.",
    icon: "🖼️",
  },
  {
    type: "wallpaper-animated",
    label: "Animated wallpaper",
    group: "media",
    defaultTarget: "{home}/Pictures/Wallpapers/{slug}",
    blurb: "Live / animated / shader wallpapers.",
    icon: "🎞️",
  },

  // -------- terminal / shell --------
  {
    type: "terminal",
    label: "Terminal",
    group: "terminal",
    defaultTarget: "{home}/.config/themehub/terminal/{slug}",
    blurb: "Generic terminal colour schemes (fits most emulators).",
    icon: "🖥️",
  },
  {
    type: "alacritty",
    label: "Alacritty",
    group: "terminal",
    defaultTarget: "{home}/.config/alacritty/themes/{slug}",
    blurb: "Alacritty toml colour schemes.",
    icon: "🟧",
  },
  {
    type: "kitty",
    label: "Kitty",
    group: "terminal",
    defaultTarget: "{home}/.config/kitty/themes/{slug}",
    blurb: "Kitty terminal themes (.conf).",
    icon: "🐱",
  },
  {
    type: "wezterm",
    label: "WezTerm",
    group: "terminal",
    defaultTarget: "{home}/.config/wezterm/themes/{slug}",
    blurb: "WezTerm lua colour schemes.",
    icon: "🧪",
  },
  {
    type: "foot",
    label: "foot",
    group: "terminal",
    defaultTarget: "{home}/.config/foot/themes/{slug}",
    blurb: "foot terminal ini colour schemes.",
    icon: "🦶",
  },
  {
    type: "ghostty",
    label: "Ghostty",
    group: "terminal",
    defaultTarget: "{home}/.config/ghostty/themes/{slug}",
    blurb: "Ghostty terminal themes.",
    icon: "👻",
  },
  {
    type: "tmux",
    label: "tmux",
    group: "terminal",
    defaultTarget: "{home}/.config/tmux/themes/{slug}",
    blurb: "tmux statusline themes.",
    icon: "📎",
  },
  {
    type: "neovim",
    label: "Neovim",
    group: "terminal",
    defaultTarget: "{home}/.config/nvim/colors/{slug}",
    blurb: "Neovim colorschemes / lua themes.",
    icon: "💚",
  },
  {
    type: "helix",
    label: "Helix",
    group: "terminal",
    defaultTarget: "{home}/.config/helix/themes/{slug}",
    blurb: "Helix editor themes.",
    icon: "🧬",
  },
  {
    type: "emacs",
    label: "Emacs",
    group: "terminal",
    defaultTarget: "{home}/.emacs.d/themes/{slug}",
    blurb: "Emacs custom themes (.el).",
    icon: "🟣",
  },
  {
    type: "fastfetch",
    label: "fastfetch",
    group: "terminal",
    defaultTarget: "{home}/.config/fastfetch/{slug}",
    blurb: "fastfetch logos + layouts.",
    icon: "⚡",
  },
  {
    type: "neofetch",
    label: "neofetch",
    group: "terminal",
    defaultTarget: "{home}/.config/neofetch/{slug}",
    blurb: "neofetch configs.",
    icon: "🖨️",
  },
  {
    type: "starship",
    label: "Starship",
    group: "terminal",
    defaultTarget: "{home}/.config/starship/themes/{slug}",
    blurb: "Starship prompt presets.",
    icon: "🚀",
  },
  {
    type: "zellij",
    label: "Zellij",
    group: "terminal",
    defaultTarget: "{home}/.config/zellij/themes/{slug}",
    blurb: "Zellij multiplexer themes.",
    icon: "🎚️",
  },

  // -------- editors / apps --------
  {
    type: "vscode",
    label: "VS Code",
    group: "apps",
    defaultTarget: "{home}/.vscode/extensions/{slug}",
    blurb: "VS Code colour and icon themes.",
    icon: "🟦",
  },
  {
    type: "jetbrains",
    label: "JetBrains",
    group: "apps",
    defaultTarget: "{home}/.config/JetBrains/themes/{slug}",
    blurb: "IntelliJ / PyCharm / Rider etc. theme JARs.",
    icon: "🎯",
  },
  {
    type: "sublime",
    label: "Sublime Text",
    group: "apps",
    defaultTarget:
      "{home}/.config/sublime-text/Packages/User/themes/{slug}",
    blurb: "Sublime Text colour schemes.",
    icon: "🟪",
  },
  {
    type: "firefox",
    label: "Firefox",
    group: "apps",
    defaultTarget: "",
    blurb: "Firefox themes (installed from the manifest homepage).",
    icon: "🦊",
  },
  {
    type: "chrome",
    label: "Chrome",
    group: "apps",
    defaultTarget: "",
    blurb: "Chromium theme packs.",
    icon: "🟢",
  },
  {
    type: "discord",
    label: "Discord",
    group: "apps",
    defaultTarget: "{home}/.config/Vencord/themes/{slug}",
    blurb: "Discord client CSS (via BetterDiscord / Vencord).",
    icon: "💬",
  },
  {
    type: "telegram",
    label: "Telegram",
    group: "apps",
    defaultTarget: "{home}/.local/share/TelegramDesktop/themes/{slug}",
    blurb: "Telegram Desktop themes (.tdesktop-theme).",
    icon: "✈️",
  },
  {
    type: "spicetify",
    label: "Spicetify",
    group: "apps",
    defaultTarget: "{home}/.config/spicetify/Themes/{slug}",
    blurb: "Spicetify Spotify themes.",
    icon: "🎵",
  },
  {
    type: "obsidian",
    label: "Obsidian",
    group: "apps",
    defaultTarget: "{home}/.config/obsidian/themes/{slug}",
    blurb: "Obsidian vault themes.",
    icon: "💎",
  },
  {
    type: "vesktop",
    label: "Vesktop",
    group: "apps",
    defaultTarget: "{home}/.config/vesktop/themes/{slug}",
    blurb: "Vesktop client themes.",
    icon: "🟣",
  },
  {
    type: "obs",
    label: "OBS",
    group: "apps",
    defaultTarget: "{home}/.config/obs-studio/themes/{slug}",
    blurb: "OBS Studio Qt themes.",
    icon: "⬛",
  },
  {
    type: "conky",
    label: "Conky",
    group: "apps",
    defaultTarget: "{home}/.config/conky/themes/{slug}",
    blurb: "Conky system-info widgets.",
    icon: "📟",
  },

  // -------- mini screens --------
  {
    type: "mini-screen",
    label: "Mini-screen (generic)",
    group: "mini-screen",
    defaultTarget: "{home}/Pictures/MiniScreens/{slug}",
    blurb: "Assets for external USB / I2C mini displays.",
    icon: "📺",
  },
  {
    type: "streamdeck",
    label: "Stream Deck",
    group: "mini-screen",
    defaultTarget: "{home}/Pictures/StreamDeck/{slug}",
    blurb: "Icon packs and profiles for Elgato Stream Deck.",
    icon: "🎛️",
  },
  {
    type: "turing-smart-screen",
    label: "Turing Smart Screen",
    group: "mini-screen",
    defaultTarget: "{home}/.config/turing-smart-screen/themes/{slug}",
    blurb: "Themes for the Turing Smart Screen 3.5\" USB display.",
    icon: "🖼️",
  },
  {
    type: "aida64",
    label: "AIDA64 / SensorPanel",
    group: "mini-screen",
    defaultTarget: "{home}/Pictures/AIDA64/{slug}",
    blurb: "AIDA64 SensorPanel + LCD dashboard layouts.",
    icon: "🌡️",
  },

  // -------- physical --------
  {
    type: "sticker",
    label: "Sticker art",
    group: "physical",
    defaultTarget: "{home}/Pictures/Stickers/{slug}",
    blurb: "Print-ready sticker designs (SVG, PDF, PNG).",
    icon: "🔖",
  },
  {
    type: "hardware",
    label: "Hardware mod",
    group: "physical",
    defaultTarget: "",
    blurb: "3D-printable cases, faceplates, decals.",
    icon: "🛠️",
  },
  {
    type: "keycap",
    label: "Keycap art",
    group: "physical",
    defaultTarget: "{home}/Pictures/Keycaps/{slug}",
    blurb: "Keycap legends / resin mold / decal art.",
    icon: "⌨️",
  },

  // -------- other --------
  {
    type: "other",
    label: "Other",
    group: "apps",
    defaultTarget: "{home}/.local/share/themehub/{slug}",
    blurb: "Doesn't fit anywhere else.",
    icon: "✳️",
  },
];

const byType = new Map(CATEGORIES.map((c) => [c.type, c] as const));

export function getCategory(type: string): Category | undefined {
  return byType.get(type as ThemeType);
}

export function isValidThemeType(type: string): type is ThemeType {
  return byType.has(type as ThemeType);
}

export const CATEGORY_GROUPS: Array<{ id: Category["group"]; label: string }> =
  [
    { id: "boot", label: "Boot" },
    { id: "desktop", label: "Desktop / Login" },
    { id: "ricing", label: "Window managers" },
    { id: "bars", label: "Bars & launchers" },
    { id: "terminal", label: "Terminal & editors" },
    { id: "apps", label: "Apps" },
    { id: "media", label: "Icons & wallpapers" },
    { id: "mini-screen", label: "Mini screens" },
    { id: "physical", label: "Physical" },
  ];
