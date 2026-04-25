import Link from "next/link";
import { db } from "@/db";
import { collections, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Card } from "@/components/ui";

export const metadata = { title: "Collections" };

export default async function CollectionsIndex() {
  const rows = await db
    .select({
      collection: collections,
      ownerName: users.name,
      ownerUsername: users.username,
    })
    .from(collections)
    .leftJoin(users, eq(users.id, collections.ownerId))
    .where(eq(collections.isPublic, true))
    .orderBy(desc(collections.createdAt))
    .limit(60);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Curated bundles of themes — &quot;my desk setup&quot;, &quot;ham radio
        rig&quot;, &quot;cyberpunk Ventoy&quot;, you name it.
      </p>
      <div className="mt-6">
        {rows.length === 0 ? (
          <Card className="p-6 text-sm text-[color:var(--muted)]">
            Nobody has shared a collection yet.{" "}
            <Link href="/collections/new" className="underline">
              Be the first.
            </Link>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <li key={r.collection.id}>
                <Link href={`/collections/${r.collection.id}`}>
                  <Card className="p-4 hover:border-[color:var(--accent)]/60">
                    <div className="font-medium">{r.collection.name}</div>
                    <p className="mt-1 line-clamp-2 text-xs text-[color:var(--muted)]">
                      {r.collection.description || "No description."}
                    </p>
                    {r.ownerUsername && (
                      <p className="mt-3 text-xs text-[color:var(--muted)]">
                        by @{r.ownerUsername}
                      </p>
                    )}
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
