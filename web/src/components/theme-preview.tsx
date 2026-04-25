// Server component. Given a theme, decides what kind of interactive preview
// makes sense (plymouth animation, grub mock, icon grid, wallpaper grid) and
// renders it.

import { Card } from "./ui";
import {
  buildArchivePreview,
  type ArchivePreview,
} from "@/server/archive-preview";
import { PlymouthPreview } from "./plymouth-preview";

interface Props {
  slug: string;
  themeType: string;
  themeName: string;
}

export async function ThemePreview({ slug, themeType, themeName }: Props) {
  void themeName;
  const preview = await buildArchivePreview(slug);
  if (!preview) return null;
  return <Dispatcher slug={slug} type={themeType} preview={preview} />;
}

function Dispatcher({
  slug,
  type,
  preview,
}: {
  slug: string;
  type: string;
  preview: ArchivePreview;
}) {
  if ((type === "icon" || type === "cursor") && preview.icons.length > 0) {
    return <IconGrid slug={slug} icons={preview.icons} />;
  }
  if (type === "plymouth" && preview.frames.length >= 4) {
    return <PlymouthPreview slug={slug} frames={preview.frames} />;
  }
  if ((type === "grub" || type === "ventoy") && preview.background) {
    return (
      <GrubMock
        slug={slug}
        background={preview.background}
        themeText={preview.themeText}
      />
    );
  }
  if (
    (type === "wallpaper" || type === "wallpaper-animated") &&
    preview.wallpapers.length > 0
  ) {
    return <WallpaperGrid slug={slug} wallpapers={preview.wallpapers} />;
  }
  if (type === "sticker" && preview.wallpapers.length > 0) {
    return <WallpaperGrid slug={slug} wallpapers={preview.wallpapers} />;
  }
  return null;
}

function IconGrid({ slug, icons }: { slug: string; icons: string[] }) {
  return (
    <Card className="mt-6 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Icon preview</h2>
        <span className="text-xs text-[color:var(--muted)]">
          {icons.length} shown · full pack in the archive
        </span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
        {icons.map((n) => (
          <a
            key={n}
            href={`/api/themes/${slug}/preview/${encodePath(n)}`}
            download
            className="group flex flex-col items-center gap-1 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card)] p-2 text-center transition hover:border-[color:var(--accent)]/70"
            title={`Download ${baseName(n)}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/themes/${slug}/preview/${encodePath(n)}`}
              alt={baseName(n)}
              className="h-12 w-12 object-contain"
              loading="lazy"
            />
            <span className="w-full truncate text-[10px] text-[color:var(--muted)] group-hover:text-[color:var(--foreground)]">
              {baseName(n)}
            </span>
          </a>
        ))}
      </div>
      <p className="mt-3 text-xs text-[color:var(--muted)]">
        Click any icon to download it individually.
      </p>
    </Card>
  );
}

function WallpaperGrid({
  slug,
  wallpapers,
}: {
  slug: string;
  wallpapers: string[];
}) {
  const sample = wallpapers.slice(0, 12);
  return (
    <Card className="mt-6 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Gallery</h2>
        <span className="text-xs text-[color:var(--muted)]">
          {wallpapers.length} image{wallpapers.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sample.map((n) => (
          <a
            key={n}
            href={`/api/themes/${slug}/preview/${encodePath(n)}`}
            download
            className="group block overflow-hidden rounded-lg border border-[color:var(--card-border)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/themes/${slug}/preview/${encodePath(n)}`}
              alt={baseName(n)}
              className="aspect-[16/9] w-full object-cover"
              loading="lazy"
            />
          </a>
        ))}
      </div>
    </Card>
  );
}

function GrubMock({
  slug,
  background,
  themeText,
}: {
  slug: string;
  background: string;
  themeText: string | null;
}) {
  const entries = [
    "Arch Linux",
    "Arch Linux (fallback)",
    "Windows 11",
    "Memtest86+",
  ];
  return (
    <Card className="mt-6 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Boot-menu mock</h2>
        <span className="text-xs text-[color:var(--muted)]">
          rendered in the browser · not pixel-perfect
        </span>
      </div>
      <div
        className="relative mt-4 aspect-video overflow-hidden rounded-lg border border-[color:var(--card-border)] bg-black"
        style={{
          backgroundImage: `url("/api/themes/${slug}/preview/${encodePath(background)}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-[70%] max-w-md rounded-md border border-white/40 bg-black/60 p-4 font-mono text-xs text-white">
            <p className="mb-2 text-center uppercase tracking-widest text-white/70">
              GNU GRUB
            </p>
            <ul className="space-y-1">
              {entries.map((e, i) => (
                <li
                  key={e}
                  className={
                    i === 0
                      ? "rounded bg-white/20 px-2 py-1"
                      : "px-2 py-1 text-white/80"
                  }
                >
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {themeText && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
            View theme.txt
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-black/80 p-3 font-mono text-[11px] text-zinc-100">
            {themeText}
          </pre>
        </details>
      )}
    </Card>
  );
}

function encodePath(p: string): string {
  return p
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function baseName(p: string): string {
  return p.split("/").pop() ?? p;
}
