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
  uploadScans,
} from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { Card } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import {
  setReportStatus,
  setThemeHidden,
  setUserBanned,
  writeAudit,
  listOpenReports,
  listRecentAudit,
  listRecentScans,
} from "@/server/moderation";

export const metadata = { title: "Admin · Moderation" };

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
  const actorId = session.user.id;

  const [stats] = await db
    .select({
      themeCount: sql<number>`(select count(*) from ${themes})`,
      hiddenThemes: sql<number>`(select count(*) from ${themes} where hidden = true)`,
      userCount: sql<number>`(select count(*) from ${users})`,
      bannedUsers: sql<number>`(select count(*) from ${users} where is_banned = true)`,
      commentCount: sql<number>`(select count(*) from ${comments})`,
      openReports: sql<number>`(select count(*) from ${reports} where status = 'open')`,
      infectedScans: sql<number>`(select count(*) from ${uploadScans} where verdict = 'infected')`,
    })
    .from(themes)
    .limit(1);

  const openReports = await listOpenReports(50);
  const recentAudit = await listRecentAudit(40);
  const recentScans = await listRecentScans(30);
  const recentThemes = await db
    .select({
      id: themes.id,
      slug: themes.slug,
      name: themes.name,
      type: themes.type,
      hidden: themes.hidden,
      createdAt: themes.createdAt,
      authorId: themes.authorId,
      authorUsername: users.username,
    })
    .from(themes)
    .leftJoin(users, eq(users.id, themes.authorId))
    .orderBy(desc(themes.createdAt))
    .limit(20);
  const recentUsers = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(20);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Moderation</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Review reports, hide themes, ban users, and audit the upload pipeline.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Themes" value={stats?.themeCount ?? 0} />
        <Stat
          label="Hidden"
          value={stats?.hiddenThemes ?? 0}
          tone={stats?.hiddenThemes ? "warn" : "default"}
        />
        <Stat label="Users" value={stats?.userCount ?? 0} />
        <Stat
          label="Banned"
          value={stats?.bannedUsers ?? 0}
          tone={stats?.bannedUsers ? "warn" : "default"}
        />
        <Stat label="Comments" value={stats?.commentCount ?? 0} />
        <Stat
          label="Open reports"
          value={stats?.openReports ?? 0}
          tone={stats?.openReports ? "warn" : "default"}
        />
        <Stat
          label="Infected uploads"
          value={stats?.infectedScans ?? 0}
          tone={stats?.infectedScans ? "danger" : "default"}
        />
      </div>

      {/* Reports queue */}
      <Section title="Open reports" empty="No open reports. Nice.">
        {openReports.map(({ report, themeSlug, themeName, reporterUsername }) => (
          <div
            key={report.id}
            className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-[color:var(--muted)]">
                <span className="rounded bg-[color:var(--card)] px-2 py-0.5">
                  {report.category}
                </span>
                <span>
                  by {reporterUsername ?? report.reporterId} ·{" "}
                  {timeAgo(report.createdAt)}
                </span>
              </div>
              {report.themeId && themeSlug && (
                <p className="mt-1">
                  Theme:{" "}
                  <Link
                    href={`/themes/${themeSlug}`}
                    className="font-medium hover:underline"
                  >
                    {themeName ?? themeSlug}
                  </Link>
                </p>
              )}
              {report.commentId && (
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  Comment id {report.commentId}
                </p>
              )}
              <p className="mt-2 whitespace-pre-wrap">{report.reason}</p>
            </div>
            <div className="flex flex-col gap-2">
              <form
                action={async () => {
                  "use server";
                  await setReportStatus({
                    reportId: report.id,
                    status: "resolved",
                    handledById: actorId,
                  });
                  await writeAudit({
                    actorId,
                    action: "report.resolve",
                    subjectType: "report",
                    subjectId: report.id,
                  });
                  revalidatePath("/admin");
                }}
              >
                <button className="h-8 rounded-lg bg-[color:var(--accent)] px-3 text-xs font-medium text-[color:var(--accent-foreground)]">
                  Resolve
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await setReportStatus({
                    reportId: report.id,
                    status: "dismissed",
                    handledById: actorId,
                  });
                  await writeAudit({
                    actorId,
                    action: "report.dismiss",
                    subjectType: "report",
                    subjectId: report.id,
                  });
                  revalidatePath("/admin");
                }}
              >
                <button className="h-8 rounded-lg border border-[color:var(--card-border)] px-3 text-xs">
                  Dismiss
                </button>
              </form>
            </div>
          </div>
        ))}
      </Section>

      {/* Themes table */}
      <Section title="Recent themes" empty="No themes yet.">
        {recentThemes.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm"
          >
            <div className="min-w-0">
              <Link
                href={`/themes/${t.slug}`}
                className="font-medium hover:underline"
              >
                {t.name}
              </Link>
              {t.hidden && (
                <span className="ml-2 rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-300">
                  hidden
                </span>
              )}
              <span className="ml-2 text-xs text-[color:var(--muted)]">
                {t.type} · by {t.authorUsername ?? "?"} · {timeAgo(t.createdAt)}
              </span>
            </div>
            <div className="flex gap-2">
              <form
                action={async () => {
                  "use server";
                  await setThemeHidden({
                    themeId: t.id,
                    hidden: !t.hidden,
                    reason: t.hidden ? null : "hidden by moderator",
                  });
                  await writeAudit({
                    actorId,
                    action: t.hidden ? "theme.unhide" : "theme.hide",
                    subjectType: "theme",
                    subjectId: t.id,
                    details: { slug: t.slug },
                  });
                  revalidatePath("/admin");
                  revalidatePath("/");
                  revalidatePath(`/themes/${t.slug}`);
                }}
              >
                <button className="text-xs underline">
                  {t.hidden ? "unhide" : "hide"}
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await db.delete(themes).where(eq(themes.id, t.id));
                  await writeAudit({
                    actorId,
                    action: "theme.delete",
                    subjectType: "theme",
                    subjectId: t.id,
                    details: { slug: t.slug },
                  });
                  revalidatePath("/admin");
                  revalidatePath("/themes");
                }}
              >
                <button className="text-xs text-red-500 underline">
                  delete
                </button>
              </form>
            </div>
          </div>
        ))}
      </Section>

      {/* Users table */}
      <Section title="Recent users" empty="No users yet.">
        {recentUsers.map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm"
          >
            <div className="min-w-0">
              <Link
                href={`/u/${u.username ?? ""}`}
                className="font-medium hover:underline"
              >
                {u.username ?? u.name ?? u.email}
              </Link>
              {u.isAdmin && (
                <span className="ml-2 rounded bg-[color:var(--accent)]/20 px-2 py-0.5 text-xs">
                  admin
                </span>
              )}
              {u.isBanned && (
                <span className="ml-2 rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-500">
                  banned
                </span>
              )}
              <span className="ml-2 text-xs text-[color:var(--muted)]">
                {u.email} · joined {timeAgo(u.createdAt)}
              </span>
            </div>
            <form
              action={async () => {
                "use server";
                if (u.id === actorId) return;
                await setUserBanned({
                  userId: u.id,
                  banned: !u.isBanned,
                  reason: u.isBanned ? null : "banned by moderator",
                });
                await writeAudit({
                  actorId,
                  action: u.isBanned ? "user.unban" : "user.ban",
                  subjectType: "user",
                  subjectId: u.id,
                  details: { username: u.username },
                });
                revalidatePath("/admin");
              }}
            >
              <button
                className="text-xs underline disabled:opacity-40"
                disabled={u.id === actorId}
              >
                {u.isBanned ? "unban" : "ban"}
              </button>
            </form>
          </div>
        ))}
      </Section>

      {/* Scan log */}
      <Section title="Upload scans" empty="No uploads scanned yet.">
        {recentScans.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-start justify-between gap-3 p-4 text-xs"
          >
            <div className="min-w-0">
              <span
                className={
                  s.verdict === "infected"
                    ? "rounded bg-red-500/20 px-2 py-0.5 text-red-500"
                    : s.verdict === "clean"
                      ? "rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-600 dark:text-emerald-400"
                      : "rounded bg-[color:var(--card)] px-2 py-0.5 text-[color:var(--muted)]"
                }
              >
                {s.verdict}
              </span>{" "}
              <span className="font-mono">
                {s.archiveSha256.slice(0, 10)}…
              </span>{" "}
              · {Math.round(s.archiveSize / 1024)} KB
              {s.themeSlug && <> · {s.themeSlug}</>}
              {s.engine && <> · {s.engine}</>}
              {s.signature && <> · {s.signature}</>}
            </div>
            <span className="text-[color:var(--muted)]">
              {timeAgo(s.createdAt)}
            </span>
          </div>
        ))}
      </Section>

      {/* Audit log */}
      <Section title="Moderator actions" empty="No actions yet.">
        {recentAudit.map(({ entry, actorUsername }) => (
          <div
            key={entry.id}
            className="flex flex-wrap items-center justify-between gap-2 p-4 text-xs"
          >
            <span>
              <span className="font-medium">{actorUsername ?? entry.actorId}</span>{" "}
              <span className="font-mono">{entry.action}</span>{" "}
              <span className="text-[color:var(--muted)]">
                {entry.subjectType}
                {entry.subjectId ? `:${entry.subjectId.slice(0, 10)}` : ""}
              </span>
            </span>
            <span className="text-[color:var(--muted)]">
              {timeAgo(entry.createdAt)}
            </span>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-500/40 bg-red-500/10"
      : tone === "warn"
        ? "border-amber-500/40 bg-amber-500/10"
        : "";
  return (
    <Card className={`p-4 ${toneClass}`}>
      <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const isEmpty = items.filter(Boolean).length === 0;
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Card className="mt-3 divide-y divide-[color:var(--card-border)]">
        {isEmpty ? (
          <p className="p-4 text-sm text-[color:var(--muted)]">{empty}</p>
        ) : (
          children
        )}
      </Card>
    </section>
  );
}
