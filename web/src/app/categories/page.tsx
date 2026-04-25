import Link from "next/link";
import { CATEGORIES, CATEGORY_GROUPS } from "@/lib/categories";
import { Card } from "@/components/ui";

export const metadata = { title: "Categories" };

export default function CategoriesIndex() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Every kind of thing you can theme on themehub.
      </p>

      {CATEGORY_GROUPS.map((group) => (
        <section key={group.id} className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
            {group.label}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.filter((c) => c.group === group.id).map((c) => (
              <Link key={c.type} href={`/categories/${c.type}`}>
                <Card className="p-4 hover:border-[color:var(--accent)]/60">
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium">
                      <span className="mr-2" aria-hidden>
                        {c.icon}
                      </span>
                      {c.label}
                    </span>
                    <code className="text-xs text-[color:var(--muted)]">
                      {c.type}
                    </code>
                  </div>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">
                    {c.blurb}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
