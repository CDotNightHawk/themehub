import Link from "next/link";
import { listThemes } from "@/server/themes";
import { ThemeCard } from "@/components/theme-card";
import { CATEGORIES } from "@/lib/categories";
import { Card, EmptyState, Input } from "@/components/ui";
import { auth } from "@/lib/auth";

export const metadata = { title: "Browse themes" };

interface SearchParams {
  q?: string;
  type?: string;
  tag?: string;
  sort?: string;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const sort =
    sp.sort === "top" || sp.sort === "downloads" || sp.sort === "name"
      ? sp.sort
      : "recent";
  const cards = await listThemes({
    q: sp.q,
    type: sp.type,
    tag: sp.tag,
    sort,
    limit: 48,
    includeNsfw: !!session?.user?.showNsfw,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Browse</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Filter and sort the catalog. Try{" "}
        <Link href="/themes?type=ventoy" className="underline">
          Ventoy themes
        </Link>{" "}
        or{" "}
        <Link href="/themes?tag=furry" className="underline">
          everything tagged <code>#furry</code>
        </Link>
        .
      </p>

      <form
        method="GET"
        className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
      >
        <Input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search themes…"
        />
        <select
          name="type"
          defaultValue={sp.type ?? ""}
          className="h-10 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card)] px-3 text-sm"
        >
          <option value="">All types</option>
          {CATEGORIES.map((c) => (
            <option key={c.type} value={c.type}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="h-10 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card)] px-3 text-sm"
        >
          <option value="recent">Recently updated</option>
          <option value="top">Top rated</option>
          <option value="downloads">Most downloaded</option>
          <option value="name">Name</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-lg bg-[color:var(--accent)] px-4 text-sm font-medium text-[color:var(--accent-foreground)]"
        >
          Apply
        </button>
        {sp.tag && (
          <input type="hidden" name="tag" value={sp.tag} />
        )}
      </form>

      {sp.tag && (
        <Card className="mt-4 flex items-center justify-between p-3 text-sm">
          <span>
            Filtering by tag <code className="font-mono">#{sp.tag}</code>
          </span>
          <Link
            href={`/themes${withoutTagQuery(sp)}`}
            className="text-[color:var(--accent)] underline"
          >
            clear
          </Link>
        </Card>
      )}

      <div className="mt-8">
        {cards.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <ThemeCard key={c.theme.id} card={c} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No themes match"
            description="Try a different filter, or be the first to upload one."
          />
        )}
      </div>
    </div>
  );
}

function withoutTagQuery(sp: SearchParams): string {
  const params = new URLSearchParams();
  if (sp.q) params.set("q", sp.q);
  if (sp.type) params.set("type", sp.type);
  if (sp.sort) params.set("sort", sp.sort);
  const s = params.toString();
  return s ? `?${s}` : "";
}
