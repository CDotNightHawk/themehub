import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getThemeBySlug } from "@/server/themes";
import {
  createThemeReport,
  isReportCategory,
} from "@/server/moderation";
import { BUCKETS, identifierFromRequest, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";

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
  const rl = await rateLimit({
    action: "report",
    identifier: identifierFromRequest(req, userId),
    ...BUCKETS.report,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `too many reports; retry in ${rl.retryAfter}s`,
        },
      },
      { status: 429, headers: { "retry-after": String(rl.retryAfter) } },
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
    category?: unknown;
    reason?: unknown;
  } | null;
  const category = isReportCategory(body?.category) ? body.category : "other";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "reason is required" } },
      { status: 400 },
    );
  }

  await createThemeReport({
    themeId: theme.id,
    reporterId: userId,
    category,
    reason,
  });
  return NextResponse.json({ ok: true });
}
