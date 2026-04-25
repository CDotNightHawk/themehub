import Link from "next/link";
import { Button, Card, EmptyState } from "@/components/ui";
import { ThemeCard } from "@/components/theme-card";
import { listThemes } from "@/server/themes";
import {
  CATEGORIES,
  CATEGORY_GROUPS,
  type Category,
} from "@/lib/categories";
import { siteName, siteTagline } from "@/lib/utils";

export default async function HomePage() {
  const trending = await listThemes({ sort: "top", limit: 6 });
  const recent = await listThemes({ sort: "recent", limit: 6 });

  const grouped = CATEGORY_GROUPS.map((g) => ({
    ...g,
    items: CATEGORIES.filter((c) => c.group === g.id),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      <section className="paw-bg my-8 rounded-2xl border border-[color:var(--card-border)] p-10 text-center sm:p-16">
        <p className="text-sm font-medium uppercase tracking-wider text-[color:var(--accent)]">
          {siteName()}
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          {siteTagline()}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-[color:var(--muted)]">
          A community-built hub for OS, bootloader, Ventoy, desktop, terminal, and even
          sticker themes. Find a look, share your own, and rice everything you own.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/themes">
            <Button size="lg">Browse themes</Button>
          </Link>
          <Link href="/themes/new">
            <Button size="lg" variant="secondary">
              Upload yours
            </Button>
          </Link>
        </div>
      </section>

      <SectionHeading
        title="Trending"
        href="/themes?sort=top"
        actionLabel="See all top-rated"
      />
      {trending.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trending.map((c) => (
            <ThemeCard key={c.theme.id} card={c} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No themes yet"
          description="Be the first to upload a theme — your work will show up here for everyone."
          action={
            <Link href="/themes/new">
              <Button>Upload a theme</Button>
            </Link>
          }
        />
      )}

      <SectionHeading
        title="Recently updated"
        href="/themes?sort=recent"
        actionLabel="See all recent"
        className="mt-12"
      />
      {recent.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((c) => (
            <ThemeCard key={c.theme.id} card={c} />
          ))}
        </div>
      ) : null}

      <SectionHeading title="Browse by category" className="mt-12" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {grouped.map((g) => (
          <Card key={g.id} className="p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              {g.label}
            </h3>
            <ul className="mt-3 grid gap-1 text-sm">
              {g.items.map((c: Category) => (
                <li key={c.type}>
                  <Link
                    href={`/categories/${c.type}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <span>
                      <span className="mr-2" aria-hidden>
                        {c.icon}
                      </span>
                      {c.label}
                    </span>
                    <span className="text-xs text-[color:var(--muted)]">
                      {c.type}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="my-12 grid gap-4 p-6 sm:grid-cols-2 sm:items-center">
        <div>
          <h3 className="text-lg font-semibold">There&apos;s a CLI for that</h3>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Install themes straight from the hub:
          </p>
          <pre className="mt-3 rounded-lg bg-black/80 p-3 font-mono text-xs text-zinc-100">
{`themehub search furry grub
themehub install furry-grub-dark`}
          </pre>
        </div>
        <div className="text-sm text-[color:var(--muted)]">
          Pinning themes in your Nix config? <code>themehub.packages.x86_64-linux.cli</code>{" "}
          gets you a build, and the NixOS module spins up a hub of your own with a few lines.{" "}
          <Link href="/docs" className="text-[color:var(--accent)] underline">
            Read the docs
          </Link>
          .
        </div>
      </Card>
    </div>
  );
}

function SectionHeading({
  title,
  href,
  actionLabel,
  className,
}: {
  title: string;
  href?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div className={`mb-4 mt-8 flex items-baseline justify-between ${className ?? ""}`}>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {href && actionLabel && (
        <Link
          href={href}
          className="text-sm text-[color:var(--accent)] hover:underline"
        >
          {actionLabel} →
        </Link>
      )}
    </div>
  );
}
