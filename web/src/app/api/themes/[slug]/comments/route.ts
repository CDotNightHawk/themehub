import { NextResponse } from "next/server";
import { auth, requireUserId } from "@/lib/auth";
import {
  getThemeBySlug,
  postComment,
  listComments,
  UploadError,
} from "@/server/themes";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const theme = await getThemeBySlug(slug);
  if (!theme) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "theme not found" } },
      { status: 404 },
    );
  }
  const cmts = await listComments(theme.id);
  return NextResponse.json({ comments: cmts });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const userId = await requireUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "sign in required" } },
      { status: 401 },
    );
  }
  const { slug } = await ctx.params;
  const theme = await getThemeBySlug(slug);
  if (!theme) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "theme not found" } },
      { status: 404 },
    );
  }
  const body = (await req.json().catch(() => null)) as {
    body?: string;
  } | null;
  try {
    await postComment(theme.id, userId, body?.body ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    throw err;
  }
}

// Suppress unused import warning when auth is only used transitively in helpers.
void auth;
