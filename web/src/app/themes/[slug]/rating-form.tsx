"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RatingForm({ slug }: { slug: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const display = hover ?? picked ?? 0;

  function rate(stars: number) {
    setPicked(stars);
    startTransition(async () => {
      await fetch(`/api/themes/${slug}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars }),
      });
      router.refresh();
    });
  }

  return (
    <div className="mt-2 flex items-center gap-1 text-2xl">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} stars`}
          disabled={pending}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          onClick={() => rate(n)}
          className={
            n <= display
              ? "text-amber-500 transition"
              : "text-[color:var(--card-border)] transition hover:text-amber-300"
          }
        >
          ★
        </button>
      ))}
      {picked != null && (
        <span className="ml-2 text-xs text-[color:var(--muted)]">
          you rated {picked}★
        </span>
      )}
    </div>
  );
}
