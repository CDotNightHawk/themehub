"use client";

import { useState } from "react";
import { REPORT_CATEGORIES, type ReportCategory } from "@/server/moderation-categories";

type Target =
  | { kind: "theme"; slug: string }
  | { kind: "comment"; id: string };

export function ReportDialog({
  target,
  label = "Report",
  buttonClassName,
}: {
  target: Target;
  label?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory>("other");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const url =
      target.kind === "theme"
        ? `/api/themes/${target.slug}/report`
        : `/api/comments/${target.id}/report`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category, reason }),
    });
    setSubmitting(false);
    if (!r.ok) {
      const body = (await r.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(body?.error?.message ?? `http ${r.status}`);
      return;
    }
    setOk(true);
    setReason("");
  }

  return (
    <>
      <button
        type="button"
        className={
          buttonClassName ??
          "text-xs text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:underline"
        }
        onClick={() => {
          setOpen(true);
          setOk(false);
          setError(null);
        }}
      >
        {label}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-[color:var(--card-border)] bg-[color:var(--background)] p-5 shadow-lg">
            <div className="flex items-start justify-between">
              <h2 className="text-base font-semibold">
                Report this {target.kind}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-sm text-[color:var(--muted)]"
              >
                ✕
              </button>
            </div>
            {ok ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm">
                  Thanks — a moderator will take a look shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-9 rounded-lg bg-[color:var(--accent)] px-4 text-sm font-medium text-[color:var(--accent-foreground)]"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--muted)]">
                    Reason
                  </span>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as ReportCategory)
                    }
                    className="h-9 w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card)] px-3 text-sm"
                  >
                    {REPORT_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--muted)]">
                    Details
                  </span>
                  <textarea
                    required
                    minLength={3}
                    maxLength={2000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="What did you see? Links, steps to reproduce…"
                    className="w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card)] p-2 text-sm"
                  />
                </label>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-9 rounded-lg px-3 text-sm text-[color:var(--muted)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || reason.trim().length < 3}
                    className="h-9 rounded-lg bg-[color:var(--accent)] px-4 text-sm font-medium text-[color:var(--accent-foreground)] disabled:opacity-50"
                  >
                    {submitting ? "Sending…" : "Send report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
