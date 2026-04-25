import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getThemeDetail,
  listComments,
} from "@/server/themes";
import { Badge, Card, Stars } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { StorageImage } from "@/components/storage-image";
import { getCategory } from "@/lib/categories";
import { auth } from "@/lib/auth";
import { CommentForm } from "./comment-form";
import { RatingForm } from "./rating-form";
import { timeAgo, formatNumber } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getThemeDetail(slug);
  if (!detail) return { title: "Not found" };
  return {
    title: detail.theme.name,
    description: detail.theme.description,
  };
}

export default async function ThemePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getThemeDetail(slug);
  if (!detail) notFound();
  const session = await auth();
  const cat = getCategory(detail.theme.type);
  const cmts = await listComments(detail.theme.id);
  const installTarget =
    detail.latestVersion?.manifest &&
    typeof detail.latestVersion.manifest === "object"
      ? // jsonb is unknown; we know shape because we wrote it.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (detail.latestVersion.manifest as any).install?.target ??
        cat?.defaultTarget ??
        "(varies)"
      : cat?.defaultTarget ?? "(varies)";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="min-w-0">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
                {cat?.label ?? detail.theme.type}
                {detail.theme.nsfw && " · NSFW"}
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                {detail.theme.name}
              </h1>
              <p className="mt-2 max-w-2xl text-[color:var(--muted)]">
                {detail.theme.description}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm">
              <Stars value={detail.rating} count={detail.ratingCount} />
              <span className="text-[color:var(--muted)]">
                {formatNumber(detail.theme.downloads)} downloads
              </span>
              <Link
                href={`/api/themes/${detail.theme.slug}/download`}
                className="rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-[color:var(--accent-foreground)]"
              >
                Download archive
              </Link>
            </div>
          </header>

          {detail.screenshots.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {detail.screenshots.map((s) => (
                <Card
                  key={s.id}
                  className="overflow-hidden"
                >
                  <StorageImage
                    storageKey={s.storageKey}
                    alt={detail.theme.name}
                    className="aspect-[16/9] w-full object-cover"
                  />
                </Card>
              ))}
            </div>
          )}

          <Card className="mt-6 p-5">
            <h2 className="text-lg font-semibold">README</h2>
            {detail.latestVersion?.readme ? (
              <Markdown>{detail.latestVersion.readme}</Markdown>
            ) : (
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                The author didn&apos;t include a README.
              </p>
            )}
          </Card>

          <Card className="mt-6 p-5">
            <h2 className="text-lg font-semibold">Install</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Use the CLI for a one-line install:
            </p>
            <pre className="mt-2 rounded-lg bg-black/80 p-3 font-mono text-xs text-zinc-100">
{`themehub install ${detail.theme.slug}`}
            </pre>
            <p className="mt-3 text-sm text-[color:var(--muted)]">
              Or download the archive and extract to:
            </p>
            <pre className="mt-2 rounded-lg bg-black/80 p-3 font-mono text-xs text-zinc-100">
{installTarget}
            </pre>
          </Card>

          <Card className="mt-6 p-5">
            <h2 className="text-lg font-semibold">Versions</h2>
            <ul className="mt-3 divide-y divide-[color:var(--card-border)] text-sm">
              {detail.versions.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span className="font-mono">{v.version}</span>
                  <span className="text-[color:var(--muted)]">
                    {timeAgo(v.createdAt)} · {formatBytes(v.archiveSize)}
                  </span>
                  <Link
                    href={`/api/themes/${detail.theme.slug}/download?v=${v.version}`}
                    className="text-[color:var(--accent)] hover:underline"
                  >
                    download
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="mt-6 p-5">
            <h2 className="text-lg font-semibold">Comments</h2>
            {session?.user ? (
              <div className="mt-3">
                <CommentForm slug={detail.theme.slug} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                <Link href="/login" className="underline">
                  Sign in
                </Link>{" "}
                to leave a comment.
              </p>
            )}
            <ul className="mt-4 space-y-4">
              {cmts.length === 0 && (
                <li className="text-sm text-[color:var(--muted)]">
                  No comments yet — be the first.
                </li>
              )}
              {cmts.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[color:var(--card)] border border-[color:var(--card-border)]">
                    {c.authorImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.authorImage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs">
                        {(c.authorUsername ?? c.authorName ?? "?")
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 text-sm">
                      <Link
                        href={`/u/${c.authorUsername ?? ""}`}
                        className="font-medium hover:underline"
                      >
                        {c.authorUsername ?? c.authorName ?? "anon"}
                      </Link>
                      <span className="text-xs text-[color:var(--muted)]">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {c.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              Author
            </h3>
            <Link
              href={`/u/${detail.authorUsername ?? ""}`}
              className="mt-2 flex items-center gap-3"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[color:var(--card)] border border-[color:var(--card-border)]">
                {detail.authorImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detail.authorImage}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>
                    {(detail.authorUsername ?? detail.authorName ?? "?")
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <div className="font-medium">
                  {detail.authorUsername ?? detail.authorName ?? "unknown"}
                </div>
                {detail.authorBio && (
                  <p className="line-clamp-2 text-xs text-[color:var(--muted)]">
                    {detail.authorBio}
                  </p>
                )}
              </div>
            </Link>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              Details
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Latest">
                {detail.latestVersion?.version ?? "—"}
              </Row>
              <Row label="License">{detail.theme.license}</Row>
              {detail.theme.homepage && (
                <Row label="Homepage">
                  <a
                    href={detail.theme.homepage}
                    className="text-[color:var(--accent)] underline"
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {hostname(detail.theme.homepage)}
                  </a>
                </Row>
              )}
              {detail.theme.repository && (
                <Row label="Source">
                  <a
                    href={detail.theme.repository}
                    className="text-[color:var(--accent)] underline"
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {hostname(detail.theme.repository)}
                  </a>
                </Row>
              )}
              <Row label="Updated">{timeAgo(detail.theme.updatedAt)}</Row>
            </dl>
          </Card>

          {detail.tags.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                Tags
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {detail.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/themes?tag=${encodeURIComponent(t)}`}
                  >
                    <Badge>#{t}</Badge>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              Rate this theme
            </h3>
            {session?.user ? (
              <RatingForm slug={detail.theme.slug} />
            ) : (
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                <Link href="/login" className="underline">
                  Sign in
                </Link>{" "}
                to rate.
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
        {label}
      </dt>
      <dd className="truncate text-right">{children}</dd>
    </div>
  );
}

function hostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
