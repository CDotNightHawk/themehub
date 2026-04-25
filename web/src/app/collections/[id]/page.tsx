import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getCollection,
  getCollectionItems,
} from "@/server/themes";
import { Card, EmptyState } from "@/components/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCollection(id);
  return { title: c?.name ?? "Collection" };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCollection(id);
  if (!c) notFound();
  const items = await getCollectionItems(c.id);
  const [owner] = await db
    .select()
    .from(users)
    .where(eq(users.id, c.ownerId))
    .limit(1);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <p className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
        Collection
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{c.name}</h1>
      {owner && (
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          by{" "}
          <Link
            href={`/u/${owner.username ?? ""}`}
            className="underline"
          >
            @{owner.username}
          </Link>
        </p>
      )}
      {c.description && (
        <p className="mt-3 max-w-2xl text-sm">{c.description}</p>
      )}

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState
            title="Empty collection"
            description="Add themes to this collection from any theme page."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <li key={it.theme.id}>
                <Link href={`/themes/${it.theme.slug}`}>
                  <Card className="p-4 hover:border-[color:var(--accent)]/60">
                    <div className="font-medium">{it.theme.name}</div>
                    <p className="mt-1 line-clamp-2 text-xs text-[color:var(--muted)]">
                      {it.theme.description}
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
