import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { apiTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "API tokens" };

export default async function TokensPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/settings/tokens");
  const userId = session.user.id;
  const sp = await searchParams;

  const tokens = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId))
    .orderBy(apiTokens.createdAt);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">API tokens</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Use a token in the CLI: <code>themehub login --token &lt;token&gt;</code>
      </p>

      {sp.created && (
        <Card className="mt-4 border-amber-400/60 bg-amber-50 p-4 text-sm dark:bg-amber-950/40">
          <p className="font-medium">Save this token now.</p>
          <p className="mt-1">
            You will not be able to see it again. Copy it somewhere safe.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-black/80 p-3 font-mono text-xs text-zinc-100">
            {sp.created}
          </pre>
        </Card>
      )}

      <Card className="mt-6 p-6">
        <form
          action={async (formData) => {
            "use server";
            const name = String(formData.get("name") ?? "").trim() || "cli";
            const tokenValue = `thh_${nanoid(40)}`;
            await db.insert(apiTokens).values({
              id: nanoid(),
              userId,
              name,
              tokenHash: await bcrypt.hash(tokenValue, 10),
            });
            revalidatePath("/settings/tokens");
            redirect(
              `/settings/tokens?created=${encodeURIComponent(tokenValue)}`,
            );
          }}
          className="flex items-end gap-2"
        >
          <label className="flex-1">
            <span className="mb-1 block text-sm font-medium">
              Name (e.g. &quot;laptop&quot;, &quot;ci&quot;)
            </span>
            <input
              name="name"
              className="h-10 w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card)] px-3 text-sm"
            />
          </label>
          <button className="h-10 rounded-lg bg-[color:var(--accent)] px-4 text-sm font-medium text-[color:var(--accent-foreground)]">
            Generate
          </button>
        </form>
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="text-lg font-semibold">Existing tokens</h2>
        {tokens.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--muted)]">No tokens yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[color:var(--card-border)] text-sm">
            {tokens.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-[color:var(--muted)]">
                    created {timeAgo(t.createdAt)}
                    {t.lastUsedAt && ` · last used ${timeAgo(t.lastUsedAt)}`}
                  </div>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await db
                      .delete(apiTokens)
                      .where(eq(apiTokens.id, t.id));
                    revalidatePath("/settings/tokens");
                  }}
                >
                  <button className="text-xs text-red-500 underline">
                    revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
