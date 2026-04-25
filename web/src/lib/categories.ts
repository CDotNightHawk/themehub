// Single source of truth for the supported theme types.
// Mirrors `docs/theme-spec.md`.

export type ThemeType =
  | "grub"
  | "refind"
  | "systemd-boot"
  | "ventoy"
  | "plymouth"
  | "sddm"
  | "gdm"
  | "gtk"
  | "kde-plasma"
  | "icon"
  | "cursor"
  | "wallpaper"
  | "terminal"
  | "vscode"
  | "firefox"
  | "sticker"
  | "hardware"
  | "other";

export interface Category {
  type: ThemeType;
  label: string;
  group: "boot" | "desktop" | "media" | "apps" | "physical";
  defaultTarget: string;
  blurb: string;
}

export const CATEGORIES: Category[] = [
  {
    type: "grub",
    label: "GRUB",
    group: "boot",
    defaultTarget: "/boot/grub/themes/{slug}",
    blurb: "Bootloader splash and menu themes for GRUB.",
  },
  {
    type: "refind",
    label: "rEFInd",
    group: "boot",
    defaultTarget: "/boot/EFI/refind/themes/{slug}",
    blurb: "Boot-manager themes for the rEFInd bootloader.",
  },
  {
    type: "systemd-boot",
    label: "systemd-boot",
    group: "boot",
    defaultTarget: "/boot/loader/themes/{slug}",
    blurb: "Themes for the systemd-boot loader.",
  },
  {
    type: "ventoy",
    label: "Ventoy",
    group: "boot",
    defaultTarget: "{home}/ventoy/themes/{slug}",
    blurb: "Backgrounds and theme.txt files for Ventoy USBs.",
  },
  {
    type: "plymouth",
    label: "Plymouth",
    group: "boot",
    defaultTarget: "/usr/share/plymouth/themes/{slug}",
    blurb: "Boot splash animations.",
  },
  {
    type: "sddm",
    label: "SDDM",
    group: "desktop",
    defaultTarget: "/usr/share/sddm/themes/{slug}",
    blurb: "Login-screen themes for the SDDM display manager.",
  },
  {
    type: "gdm",
    label: "GDM",
    group: "desktop",
    defaultTarget: "/usr/share/gnome-shell/theme/{slug}",
    blurb: "GNOME login-screen themes.",
  },
  {
    type: "gtk",
    label: "GTK",
    group: "desktop",
    defaultTarget: "{home}/.themes/{slug}",
    blurb: "GTK 3/4 desktop themes.",
  },
  {
    type: "kde-plasma",
    label: "KDE / Plasma",
    group: "desktop",
    defaultTarget: "{home}/.local/share/plasma/desktoptheme/{slug}",
    blurb: "Plasma desktop themes, look & feel packs.",
  },
  {
    type: "icon",
    label: "Icon pack",
    group: "desktop",
    defaultTarget: "{home}/.icons/{slug}",
    blurb: "Icon sets for any desktop environment.",
  },
  {
    type: "cursor",
    label: "Cursor pack",
    group: "desktop",
    defaultTarget: "{home}/.icons/{slug}",
    blurb: "Mouse cursor themes.",
  },
  {
    type: "wallpaper",
    label: "Wallpaper",
    group: "media",
    defaultTarget: "{home}/Pictures/Wallpapers/{slug}",
    blurb: "Static or animated wallpapers.",
  },
  {
    type: "terminal",
    label: "Terminal",
    group: "apps",
    defaultTarget: "{home}/.config/themehub/terminal/{slug}",
    blurb: "Color schemes for Alacritty, Kitty, WezTerm, etc.",
  },
  {
    type: "vscode",
    label: "VS Code",
    group: "apps",
    defaultTarget: "{home}/.vscode/extensions/{slug}",
    blurb: "VS Code color and icon themes.",
  },
  {
    type: "firefox",
    label: "Firefox",
    group: "apps",
    defaultTarget: "",
    blurb: "Firefox themes (installed from the manifest homepage).",
  },
  {
    type: "sticker",
    label: "Sticker art",
    group: "physical",
    defaultTarget: "{home}/Pictures/Stickers/{slug}",
    blurb: "Print-ready sticker designs (SVG, PDF, PNG).",
  },
  {
    type: "hardware",
    label: "Hardware mod",
    group: "physical",
    defaultTarget: "",
    blurb: "3D-printable cases, faceplates, decals, keycap art.",
  },
  {
    type: "other",
    label: "Other",
    group: "apps",
    defaultTarget: "{home}/.local/share/themehub/{slug}",
    blurb: "Doesn't fit anywhere else.",
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
    { id: "desktop", label: "Desktop" },
    { id: "media", label: "Media" },
    { id: "apps", label: "Apps" },
    { id: "physical", label: "Physical" },
  ];
