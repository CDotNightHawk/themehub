"use client";

import { useEffect, useState } from "react";
import { Card } from "./ui";

export interface LightboxItem {
  id: string;
  url: string;
  caption?: string;
}

// Grid of thumbnails that open a modal with keyboard navigation.
// The `url`s are resolved server-side by the parent so the lightbox itself
// doesn't have to care about the storage driver.
export function Lightbox({
  items,
  alt,
}: {
  items: LightboxItem[];
  alt: string;
}) {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
      if (e.key === "ArrowRight") {
        setActive((a) =>
          a === null ? null : (a + 1) % items.length,
        );
      }
      if (e.key === "ArrowLeft") {
        setActive((a) =>
          a === null ? null : (a - 1 + items.length) % items.length,
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, items.length]);

  if (items.length === 0) return null;

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((s, i) => (
          <Card key={s.id} className="overflow-hidden">
            <button
              type="button"
              onClick={() => setActive(i)}
              className="group block w-full text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.url}
                alt={s.caption || alt}
                className="aspect-[16/9] w-full object-cover transition group-hover:scale-[1.01]"
                loading="lazy"
              />
            </button>
          </Card>
        ))}
      </div>

      {active !== null && items[active] && (
        <div
          role="dialog"
          aria-label={`${alt} screenshots`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setActive(null)}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            ✕
          </button>
          {items.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive(
                    (a) =>
                      a === null ? null : (a - 1 + items.length) % items.length,
                  );
                }}
                className="absolute left-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive((a) =>
                    a === null ? null : (a + 1) % items.length,
                  );
                }}
                className="absolute right-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                ›
              </button>
            </>
          )}
          <div
            className="max-h-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={items[active].url}
              alt={items[active].caption || alt}
              className="max-h-[85vh] w-auto rounded-xl"
            />
            {items[active].caption && (
              <p className="mt-3 text-center text-sm text-white/80">
                {items[active].caption}
              </p>
            )}
            <p className="mt-1 text-center text-xs text-white/60">
              {active + 1} / {items.length} · Esc to close · ←→ to navigate
            </p>
          </div>
        </div>
      )}
    </>
  );
}
