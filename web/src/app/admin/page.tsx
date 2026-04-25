import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  themes,
  users,
  reports,
  comments,
} from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { Card } from "@/components/ui";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/admin");
  if (!session.user.isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold">Forbidden</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Only admins can see this page. Add your email to{" "}
          <code>ADMIN_USERS</code> in the server&apos;s env to grant access.
        </p>
      </div>
    );
  }

  const stats = await db
    .select({
      themeCount: sql<number>`(select count(*) from ${themes})`,
      userCount: sql<number>`(select count(*) from ${users})`,
      commentCount: sql<number>`(select count(*) from ${comments})`,
      openReports: sql<number>`(select count(*) from ${reports} where resolved = false)`,
    })
    .from(themes)
    .limit(1);
  const [s] = stats;
  const recentThemes = await db
    .select()
    .from(themes)
    .orderBy(desc(themes.createdAt))
    .limit(20);
  const openReports = await db
    .select()
    .from(reports)
    .where(eq(reports.resolved, false))
    .orderBy(desc(reports.createdAt))
    .limit(20);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Lightweight moderation tools.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Themes" value={s?.themeCount ?? 0} />
        <Stat label="Users" value={s?.userCount ?? 0} />
        <Stat label="Comments" value={s?.commentCount ?? 0} />
        <Stat label="Open reports" value={s?.openReports ?? 0} />
      </div>

      <h2 className="mt-10 text-lg font-semibold">Recent themes</h2>
      <Card className="mt-3 divide-y divide-[color:var(--card-border)]">
        {recentThemes.length === 0 && (
          <p className="p-4 text-sm text-[color:var(--muted)]">No themes yet.</p>
        )}
        {recentThemes.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm"
          >
            <div>
              <Link
                href={`/themes/${t.slug}`}
                className="font-medium hover:underline"
              >
                {t.name}
              </Link>{" "}
              <span className="text-xs text-[color:var(--muted)]">
                {t.type} · {timeAgo(t.createdAt)}
              </span>
            </div>
            <form
              action={async () => {
                "use server";
                await db.delete(themes).where(eq(themes.id, t.id));
                revalidatePath("/admin");
                revalidatePath("/themes");
              }}
            >
              <button className="text-xs text-red-500 underline">
                delete
              </button>
            </form>
          </div>
        ))}
      </Card>

      <h2 className="mt-10 text-lg font-semibold">Open reports</h2>
      <Card className="mt-3 divide-y divide-[color:var(--card-border)]">
        {openReports.length === 0 && (
          <p className="p-4 text-sm text-[color:var(--muted)]">
            No open reports. Nice.
          </p>
        )}
        {openReports.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm"
          >
            <div className="min-w-0">
              <p className="font-medium">{r.reason}</p>
              <p className="text-xs text-[color:var(--muted)]">
                {r.themeId ? `theme ${r.themeId}` : null}
                {r.commentId ? `comment ${r.commentId}` : null} ·{" "}
                {timeAgo(r.createdAt)}
              </p>
            </div>
            <form
              action={async () => {
                "use server";
                await db
                  .update(reports)
                  .set({ resolved: true })
                  .where(eq(reports.id, r.id));
                revalidatePath("/admin");
              }}
            >
              <button className="text-xs underline">resolve</button>
            </form>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </Card>
  );
}
