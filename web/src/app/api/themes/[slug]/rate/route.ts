import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getThemeBySlug, rateTheme, UploadError } from "@/server/themes";

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
    stars?: number;
  } | null;
  try {
    await rateTheme(theme.id, userId, Number(body?.stars ?? 0));
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
