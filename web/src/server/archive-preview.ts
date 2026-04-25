import AdmZip from "adm-zip";
import { getStorage } from "@/lib/storage";
import { getThemeBySlug, getLatestVersion } from "@/server/themes";

export interface ArchivePreview {
  /** Icon/cursor preview: filenames inside the archive to show in a grid. */
  icons: string[];
  /** Plymouth/animation preview: filenames of sequential frames. */
  frames: string[];
  /** For grub/ventoy: the background image path, if one exists. */
  background: string | null;
  /** Raw theme.txt contents, if grub/ventoy. */
  themeText: string | null;
  /** For wallpapers: every image file in the archive. */
  wallpapers: string[];
  /** Total count of image assets in the archive. */
  imageCount: number;
}

const IMG_RE = /\.(png|jpe?g|gif|webp|svg|avif|ico)$/i;

export async function buildArchivePreview(
  slug: string,
): Promise<ArchivePreview | null> {
  const theme = await getThemeBySlug(slug);
  if (!theme) return null;
  const latest = await getLatestVersion(theme.id);
  if (!latest) return null;

  let buf: Buffer;
  try {
    buf = await getStorage().get(latest.archiveKey);
  } catch {
    return null;
  }
  let zip: AdmZip;
  try {
    zip = new AdmZip(buf);
  } catch {
    return null;
  }
  const names = zip
    .getEntries()
    .filter((e) => !e.isDirectory)
    .map((e) => e.entryName.replace(/^\/+/, ""));

  const images = names.filter((n) => IMG_RE.test(n));
  const themeTxtEntry = zip
    .getEntries()
    .find((e) =>
      /(^|\/)theme\.txt$/i.test(e.entryName.replace(/^\/+/, "")),
    );
  const themeText = themeTxtEntry
    ? themeTxtEntry.getData().toString("utf8").slice(0, 20_000)
    : null;

  // Icon pack: pick up to 24 images, favouring a "scalable" subdir if present
  // (xdg icon theme layout) and larger square sizes.
  const iconCandidates = images
    .filter((n) => !n.toLowerCase().includes("screenshot"))
    .sort((a, b) => iconScore(b) - iconScore(a));
  const icons = dedupeByBaseName(iconCandidates).slice(0, 24);

  // Plymouth / animation frames: look for a sequence like frame-001.png,
  // or progress-*.png, or sequential numeric suffixes in the same directory.
  const frames = detectFrameSequence(images);

  // Background / wallpaper: common grub / ventoy / plymouth filenames.
  const backgroundHints = [
    /background\.(png|jpe?g)$/i,
    /wallpaper\.(png|jpe?g)$/i,
    /splash\.(png|jpe?g)$/i,
    /(^|\/)bg\.(png|jpe?g)$/i,
  ];
  let background: string | null = null;
  for (const re of backgroundHints) {
    const hit = images.find((n) => re.test(n));
    if (hit) {
      background = hit;
      break;
    }
  }
  if (!background && themeText) {
    const m = themeText.match(/^\s*desktop-image\s*:\s*"?([^"\n]+)/im);
    if (m) {
      const ref = m[1].trim();
      const hit = images.find(
        (n) => n === ref || n.endsWith("/" + ref) || n.toLowerCase() === ref.toLowerCase(),
      );
      if (hit) background = hit;
    }
  }

  return {
    icons,
    frames,
    background,
    themeText,
    wallpapers: images,
    imageCount: images.length,
  };
}

function iconScore(name: string): number {
  let s = 0;
  if (/\.svg$/i.test(name)) s += 100;
  if (/scalable/i.test(name)) s += 50;
  const sizeMatch = name.match(/(\d+)x\1/);
  if (sizeMatch) {
    const n = parseInt(sizeMatch[1], 10);
    if (n >= 48 && n <= 512) s += 20;
  }
  if (/apps|actions|places|categories/i.test(name)) s += 5;
  if (/cursor/i.test(name)) s += 3;
  return s;
}

function dedupeByBaseName(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const base = n.split("/").pop()!.replace(/\.[^.]+$/, "").toLowerCase();
    if (seen.has(base)) continue;
    seen.add(base);
    out.push(n);
  }
  return out;
}

function detectFrameSequence(names: string[]): string[] {
  // Group by (directory, non-numeric prefix) and pick the group with the
  // most files whose basenames end in a number.
  const groups = new Map<string, Array<{ name: string; n: number }>>();
  for (const n of names) {
    if (!IMG_RE.test(n)) continue;
    const base = n.split("/").pop()!;
    const m = base.match(/^(.+?)[-_]?(\d+)\.[^.]+$/);
    if (!m) continue;
    const key = `${n.slice(0, n.length - base.length)}${m[1]}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ name: n, n: parseInt(m[2], 10) });
  }
  let best: Array<{ name: string; n: number }> = [];
  for (const g of groups.values()) {
    if (g.length > best.length) best = g;
  }
  if (best.length < 4) return [];
  best.sort((a, b) => a.n - b.n);
  return best.map((x) => x.name).slice(0, 48);
}
