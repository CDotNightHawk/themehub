import { NextResponse } from "next/server";
import { auth, requireUserId } from "@/lib/auth";
import { uploadTheme, UploadError } from "@/server/themes";
import { listThemes } from "@/server/themes";
import { BUCKETS, identifierFromRequest, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const session = await auth();
  const cards = await listThemes({
    q: url.searchParams.get("q") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    sort: (url.searchParams.get("sort") as "recent" | "top" | undefined) ?? "recent",
    limit: clampInt(url.searchParams.get("limit"), 1, 100, 24),
    includeNsfw: !!session?.user?.showNsfw,
  });
  return NextResponse.json({
    themes: cards.map((c) => ({
      slug: c.theme.slug,
      name: c.theme.name,
      type: c.theme.type,
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
    return errorResponse("UNAUTHORIZED", "you must be signed in", 401);
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
      {
        status: 429,
        headers: { "retry-after": String(rl.retryAfter) },
      },
    );
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return errorResponse(
      "INVALID_INPUT",
      "expected multipart/form-data with an 'archive' field",
    );
  }

  const form = await req.formData();
  const archive = form.get("archive");
  if (!(archive instanceof File)) {
    return errorResponse("INVALID_INPUT", "missing 'archive' file");
  }
  if (archive.size > 50 * 1024 * 1024) {
    return errorResponse(
      "INVALID_INPUT",
      "archive too large (max 50 MB)",
      413,
    );
  }
  const buf = Buffer.from(await archive.arrayBuffer());
  const notes = String(form.get("notes") ?? "").slice(0, 4000);

  try {
    const result = await uploadTheme({
      archive: buf,
      notes,
      uploaderId: userId,
    });
    return NextResponse.json({
      slug: result.theme.slug,
      version: result.version.version,
    });
  } catch (err) {
    if (err instanceof UploadError) {
      return errorResponse(err.code, err.message, err.status);
    }
    console.error(err);
    return errorResponse("INTERNAL", "upload failed", 500);
  }
}

function clampInt(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function errorResponse(code: string, message: string, status = 400) {
  return NextResponse.json(
    { error: { code, message } },
    { status },
  );
}
