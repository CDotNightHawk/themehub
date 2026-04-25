import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategory } from "@/lib/categories";
import { listThemes } from "@/server/themes";
import { ThemeCard } from "@/components/theme-card";
import { EmptyState } from "@/components/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const cat = getCategory(type);
  return { title: cat?.label ?? "Category" };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const cat = getCategory(type);
  if (!cat) notFound();
  const cards = await listThemes({ type, sort: "recent", limit: 100 });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <p className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
        Category
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        {cat.label}
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-[color:var(--muted)]">
        {cat.blurb}
      </p>
      {cat.defaultTarget && (
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          Default install target:{" "}
          <code className="font-mono">{cat.defaultTarget}</code>
        </p>
      )}
      <div className="mt-8">
        {cards.length === 0 ? (
          <EmptyState
            title={`No ${cat.label} themes yet`}
            description="Be the first to publish one — your work will live here."
            action={
              <Link
                href="/themes/new"
                className="text-[color:var(--accent)] underline"
              >
                Upload a theme
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <ThemeCard key={c.theme.id} card={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
