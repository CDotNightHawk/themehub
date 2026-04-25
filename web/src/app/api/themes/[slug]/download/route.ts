import { NextResponse } from "next/server";
import {
  getThemeBySlug,
  getLatestVersion,
  incrementDownloads,
} from "@/server/themes";
import { db } from "@/db";
import { themeVersions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getStorage } from "@/lib/storage";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const theme = await getThemeBySlug(slug);
  if (!theme) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "theme not found" } },
      { status: 404 },
    );
  }
  const requestedVersion = url.searchParams.get("v");
  let version;
  if (requestedVersion) {
    [version] = await db
      .select()
      .from(themeVersions)
      .where(
        and(
          eq(themeVersions.themeId, theme.id),
          eq(themeVersions.version, requestedVersion),
        ),
      )
      .limit(1);
  } else {
    version = (await getLatestVersion(theme.id)) ?? undefined;
  }
  if (!version) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "version not found" } },
      { status: 404 },
    );
  }
  const buf = await getStorage().get(version.archiveKey);
  await incrementDownloads(theme.id);
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(buf.length),
      "Content-Disposition": `attachment; filename="${theme.slug}-${version.version}.zip"`,
      "X-Theme-Sha256": version.archiveSha256,
    },
  });
}
