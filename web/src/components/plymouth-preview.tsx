"use client";

import { useEffect, useState } from "react";
import { Card } from "./ui";

// Cycles through the discovered plymouth frames to simulate the boot splash.
// Defaults to ~24 fps; pausable. Frames are served out of the archive by
// /api/themes/:slug/preview/:path.
export function PlymouthPreview({
  slug,
  frames,
}: {
  slug: string;
  frames: string[];
}) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [fps, setFps] = useState(24);

  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % frames.length);
    }, 1000 / fps);
    return () => clearInterval(t);
  }, [playing, fps, frames.length]);

  if (frames.length === 0) return null;
  const current = frames[idx];

  return (
    <Card className="mt-6 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Boot animation</h2>
        <span className="text-xs text-[color:var(--muted)]">
          {frames.length} frames · {fps} fps
        </span>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-[color:var(--card-border)] bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/themes/${slug}/preview/${encodePath(current)}`}
          alt={`frame ${idx + 1}`}
          className="mx-auto aspect-video w-full object-contain"
          loading="eager"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)]">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="rounded-md border border-[color:var(--card-border)] px-3 py-1 hover:border-[color:var(--accent)]/60"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <label className="flex items-center gap-2">
          Speed
          <input
            type="range"
            min={4}
            max={48}
            value={fps}
            onChange={(e) => setFps(parseInt(e.target.value, 10))}
          />
        </label>
        <span>
          frame {idx + 1} / {frames.length}
        </span>
      </div>
    </Card>
  );
}

function encodePath(p: string): string {
  return p
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}
