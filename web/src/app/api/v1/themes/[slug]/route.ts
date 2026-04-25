import { NextResponse } from "next/server";
import { getThemeDetail } from "@/server/themes";
import { getStorage } from "@/lib/storage";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const detail = await getThemeDetail(slug);
  if (!detail) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "theme not found" } },
      { status: 404 },
    );
  }
  const storage = getStorage();
  const screenshots = await Promise.all(
    detail.screenshots.map(async (s) => ({
      url: await storage.url(s.storageKey),
      caption: s.caption,
    })),
  );

  return NextResponse.json({
    slug: detail.theme.slug,
    name: detail.theme.name,
    type: detail.theme.type,
    description: detail.theme.description,
    license: detail.theme.license,
    nsfw: detail.theme.nsfw,
    homepage: detail.theme.homepage,
    repository: detail.theme.repository,
    tags: detail.tags,
    rating: detail.rating,
    ratingCount: detail.ratingCount,
    downloads: detail.theme.downloads,
    author: detail.authorUsername,
    latestVersion: detail.latestVersion?.version ?? null,
    versions: detail.versions.map((v) => ({
      version: v.version,
      notes: v.notes,
      sha256: v.archiveSha256,
      size: v.archiveSize,
      createdAt: v.createdAt,
      archiveUrl: `/api/v1/themes/${detail.theme.slug}/versions/${v.version}/archive`,
    })),
    manifest: detail.latestVersion?.manifest ?? null,
    readme: detail.latestVersion?.readme ?? "",
    screenshots,
  });
}
