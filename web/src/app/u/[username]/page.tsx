import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { users, collections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { listThemes } from "@/server/themes";
import { ThemeCard } from "@/components/theme-card";
import { Card } from "@/components/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (!user) notFound();

  const cards = await listThemes({
    authorId: user.id,
    sort: "recent",
    limit: 100,
    includeNsfw: true,
  });
  const userCollections = await db
    .select()
    .from(collections)
    .where(eq(collections.ownerId, user.id))
    .orderBy(collections.createdAt);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-[color:var(--card)] border border-[color:var(--card-border)] text-2xl">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{(user.username ?? user.name ?? "?").slice(0, 1).toUpperCase()}</span>
          )}
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {user.name ?? user.username}
          </h1>
          <p className="text-sm text-[color:var(--muted)]">@{user.username}</p>
          {user.bio && (
            <p className="mt-2 max-w-xl text-sm">{user.bio}</p>
          )}
        </div>
      </header>

      <h2 className="mt-10 text-lg font-semibold">
        Themes ({cards.length})
      </h2>
      {cards.length === 0 ? (
        <Card className="mt-3 p-6 text-sm text-[color:var(--muted)]">
          {user.username} hasn&apos;t published any themes yet.
        </Card>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <ThemeCard key={c.theme.id} card={c} />
          ))}
        </div>
      )}

      {userCollections.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">Collections</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {userCollections
              .filter((c) => c.isPublic)
              .map((c) => (
                <li key={c.id}>
                  <Link href={`/collections/${c.id}`}>
                    <Card className="p-4 hover:border-[color:var(--accent)]/60">
                      <div className="font-medium">{c.name}</div>
                      <p className="mt-1 line-clamp-2 text-xs text-[color:var(--muted)]">
                        {c.description || "No description."}
                      </p>
                    </Card>
                  </Link>
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}
