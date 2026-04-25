import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

export function timeAgo(d: Date | string | number): string {
  const date = d instanceof Date ? d : new Date(d);
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const units: Array<[string, number]> = [
    ["y", 60 * 60 * 24 * 365],
    ["mo", 60 * 60 * 24 * 30],
    ["d", 60 * 60 * 24],
    ["h", 60 * 60],
    ["m", 60],
    ["s", 1],
  ];
  for (const [label, secs] of units) {
    const v = Math.floor(seconds / secs);
    if (v >= 1) return `${v}${label} ago`;
  }
  return "just now";
}

export function siteName(): string {
  return process.env.SITE_NAME ?? "themehub";
}

export function siteTagline(): string {
  return process.env.SITE_TAGLINE ?? "Theme everything.";
}

export function publicUrl(): string {
  return process.env.PUBLIC_URL ?? "http://localhost:3000";
}

export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_USERS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function allowRegistration(): boolean {
  return (process.env.ALLOW_REGISTRATION ?? "true") === "true";
}

export function defaultHideNsfw(): boolean {
  return (process.env.DEFAULT_HIDE_NSFW ?? "true") === "true";
}
