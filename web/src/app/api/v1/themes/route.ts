// Public REST API consumed by the `themehub` CLI. Versioned under /api/v1 —
// keep backwards-compat or bump the prefix.
import { NextResponse } from "next/server";
import { listThemes, uploadTheme, UploadError } from "@/server/themes";
import { requireUserId } from "@/lib/auth";
import { BUCKETS, identifierFromRequest, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sortRaw = url.searchParams.get("sort") ?? "recent";
  const sort: "recent" | "top" | "downloads" | "name" =
    sortRaw === "top" || sortRaw === "downloads" || sortRaw === "name"
      ? sortRaw
      : "recent";
  const includeNsfw = url.searchParams.get("nsfw") === "1";
  const cards = await listThemes({
    q: url.searchParams.get("q") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    sort,
    limit: clampInt(url.searchParams.get("limit"), 1, 100, 24),
    offset: clampInt(url.searchParams.get("offset"), 0, 10_000, 0),
    includeNsfw,
  });
  return NextResponse.json({
    themes: cards.map((c) => ({
      slug: c.theme.slug,
      name: c.theme.name,
      type: c.theme.type,
      version: undefined, // populated in detail endpoint
      description: c.theme.description,
      tags: c.tags,
      rating: c.rating,
      ratingCount: c.ratingCount,
      downloads: c.theme.downloads,
      author: c.authorUsername,
      nsfw: c.theme.nsfw,
      updatedAt: c.theme.updatedAt,
    })),
  });
}

export async function POST(req: Request) {
  const userId = await requireUserId(req);
  if (!userId) {
    return err("UNAUTHORIZED", "missing or invalid token", 401);
  }
  const rl = await rateLimit({
    action: "upload",
    identifier: identifierFromRequest(req, userId),
    ...BUCKETS.upload,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `too many uploads; retry in ${rl.retryAfter}s`,
        },
      },
      { status: 429, headers: { "retry-after": String(rl.retryAfter) } },
    );
  }
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return err("INVALID_INPUT", "expected multipart/form-data", 400);
  }
  const fd = await req.formData();
  const archive = fd.get("archive");
  if (!(archive instanceof File))
    return err("INVALID_INPUT", "missing 'archive'", 400);
  if (archive.size > 50 * 1024 * 1024)
    return err("INVALID_INPUT", "archive too large", 413);
  const buf = Buffer.from(await archive.arrayBuffer());
  const notes = String(fd.get("notes") ?? "").slice(0, 4000);
  try {
    const r = await uploadTheme({ archive: buf, notes, uploaderId: userId });
    return NextResponse.json({
      slug: r.theme.slug,
      version: r.version.version,
    });
  } catch (e) {
    if (e instanceof UploadError) return err(e.code, e.message, e.status);
    console.error(e);
    return err("INTERNAL", "upload failed", 500);
  }
}

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function clampInt(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
) {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
