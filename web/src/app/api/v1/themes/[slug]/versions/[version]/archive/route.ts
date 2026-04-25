import { NextResponse } from "next/server";
import { db } from "@/db";
import { themeVersions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getThemeBySlug, incrementDownloads } from "@/server/themes";
import { getStorage } from "@/lib/storage";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string; version: string }> },
) {
  const { slug, version } = await ctx.params;
  const theme = await getThemeBySlug(slug);
  if (!theme) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "theme not found" } },
      { status: 404 },
    );
  }
  const [v] = await db
    .select()
    .from(themeVersions)
    .where(
      and(
        eq(themeVersions.themeId, theme.id),
        eq(themeVersions.version, version),
      ),
    )
    .limit(1);
  if (!v) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "version not found" } },
      { status: 404 },
    );
  }
  const buf = await getStorage().get(v.archiveKey);
  await incrementDownloads(theme.id);
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(buf.length),
      "Content-Disposition": `attachment; filename="${theme.slug}-${v.version}.zip"`,
      "X-Theme-Sha256": v.archiveSha256,
    },
  });
}
