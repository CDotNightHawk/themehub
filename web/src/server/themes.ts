import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import {
  themes,
  themeVersions,
  themeScreenshots,
  themeTags,
  ratings,
  comments,
  users,
  collections,
  collectionItems,
  type Theme,
  type ThemeVersion,
  type ThemeScreenshot,
  type ThemeManifest,
} from "@/db/schema";
import { extractZip, ArchiveError } from "./archive";
import { compareSemver, manifestToRecord } from "@/lib/theme-spec";
import { getStorage } from "@/lib/storage";
import { isValidThemeType } from "@/lib/categories";

export interface UploadInput {
  archive: Buffer;
  notes?: string;
  uploaderId: string;
}

export interface UploadResult {
  theme: Theme;
  version: ThemeVersion;
}

export class UploadError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export async function uploadTheme(input: UploadInput): Promise<UploadResult> {
  let extracted;
  try {
    extracted = extractZip(input.archive);
  } catch (err) {
    if (err instanceof ArchiveError) {
      throw new UploadError(err.code, err.message);
    }
    throw new UploadError("INVALID_MANIFEST", "could not parse archive");
  }
  const m = extracted.manifest;
  if (!isValidThemeType(m.theme.type)) {
    throw new UploadError("INVALID_MANIFEST", `unknown type: ${m.theme.type}`);
  }

  const storage = getStorage();

  // Resolve or create theme row.
  let theme = await getThemeBySlug(m.theme.slug);
  if (theme) {
    if (theme.authorId !== input.uploaderId) {
      throw new UploadError(
        "FORBIDDEN",
        "you are not the owner of this theme",
        403,
      );
    }
    // Check semver is greater than existing latest.
    const latest = await getLatestVersion(theme.id);
    if (latest && compareSemver(m.theme.version, latest.version) <= 0) {
      throw new UploadError(
        "VERSION_CONFLICT",
        `version ${m.theme.version} must be greater than ${latest.version}`,
        409,
      );
    }
  } else {
    const newId = nanoid();
    await db.insert(themes).values({
      id: newId,
      slug: m.theme.slug,
      name: m.theme.name,
      type: m.theme.type,
      description: m.theme.description,
      homepage: m.theme.homepage ?? null,
      repository: m.theme.repository ?? null,
      license: m.theme.license,
      nsfw: m.theme.nsfw ?? false,
      authorId: input.uploaderId,
    });
    theme = (await getThemeBySlug(m.theme.slug))!;
  }

  // Store archive + screenshots.
  const versionId = nanoid();
  const archiveKey = `themes/${theme.slug}/${m.theme.version}/archive.zip`;
  await storage.put(
    archiveKey,
    extracted.archiveBuffer,
    "application/zip",
  );

  await db.insert(themeVersions).values({
    id: versionId,
    themeId: theme.id,
    version: m.theme.version,
    notes: input.notes ?? "",
    manifest: manifestToRecord(m),
    archiveKey,
    archiveSize: extracted.archiveBuffer.length,
    archiveSha256: extracted.archiveSha256,
    readme: extracted.readme,
  });

  for (let i = 0; i < extracted.screenshots.length; i++) {
    const s = extracted.screenshots[i];
    const ext = s.path.slice(s.path.lastIndexOf("."));
    const key = `themes/${theme.slug}/${m.theme.version}/screenshot-${i}${ext}`;
    await storage.put(key, s.bytes, s.contentType);
    await db.insert(themeScreenshots).values({
      id: nanoid(),
      versionId,
      storageKey: key,
      caption: "",
      sortOrder: i,
    });
  }

  // Update tags.
  if (m.theme.tags.length) {
    await db.delete(themeTags).where(eq(themeTags.themeId, theme.id));
    await db.insert(themeTags).values(
      m.theme.tags.map((tag) => ({ themeId: theme!.id, tag })),
    );
  }

  // Update theme metadata to match latest manifest.
  await db
    .update(themes)
    .set({
      name: m.theme.name,
      description: m.theme.description,
      homepage: m.theme.homepage ?? null,
      repository: m.theme.repository ?? null,
      license: m.theme.license,
      nsfw: m.theme.nsfw ?? false,
      latestVersionId: versionId,
      updatedAt: new Date(),
    })
    .where(eq(themes.id, theme.id));

  const [updatedTheme] = await db
    .select()
    .from(themes)
    .where(eq(themes.id, theme.id))
    .limit(1);
  const [version] = await db
    .select()
    .from(themeVersions)
    .where(eq(themeVersions.id, versionId))
    .limit(1);

  return { theme: updatedTheme, version };
}

export async function getThemeBySlug(slug: string): Promise<Theme | null> {
  const [t] = await db
    .select()
    .from(themes)
    .where(eq(themes.slug, slug))
    .limit(1);
  return t ?? null;
}

export async function getLatestVersion(
  themeId: string,
): Promise<ThemeVersion | null> {
  const [v] = await db
    .select()
    .from(themeVersions)
    .where(eq(themeVersions.themeId, themeId))
    .orderBy(desc(themeVersions.createdAt))
    .limit(1);
  return v ?? null;
}

export async function listVersions(themeId: string): Promise<ThemeVersion[]> {
  return db
    .select()
    .from(themeVersions)
    .where(eq(themeVersions.themeId, themeId))
    .orderBy(desc(themeVersions.createdAt));
}

export async function listScreenshots(
  versionId: string,
): Promise<ThemeScreenshot[]> {
  return db
    .select()
    .from(themeScreenshots)
    .where(eq(themeScreenshots.versionId, versionId))
    .orderBy(themeScreenshots.sortOrder);
}

export async function listTags(themeId: string): Promise<string[]> {
  const rows = await db
    .select({ tag: themeTags.tag })
    .from(themeTags)
    .where(eq(themeTags.themeId, themeId));
  return rows.map((r) => r.tag);
}

export interface ThemeListFilters {
  type?: string;
  tag?: string;
  q?: string;
  authorId?: string;
  sort?: "recent" | "top" | "name" | "downloads";
  limit?: number;
  offset?: number;
  includeNsfw?: boolean;
}

export interface ThemeCard {
  theme: Theme;
  authorName: string | null;
  authorUsername: string | null;
  authorImage: string | null;
  rating: number | null;
  ratingCount: number;
  screenshotKey: string | null;
  tags: string[];
}

export async function listThemes(
  f: ThemeListFilters = {},
): Promise<ThemeCard[]> {
  const conds = [] as ReturnType<typeof eq>[];
  if (f.type) conds.push(eq(themes.type, f.type));
  if (f.authorId) conds.push(eq(themes.authorId, f.authorId));
  if (!f.includeNsfw) conds.push(eq(themes.nsfw, false));
  if (f.q && f.q.trim()) {
    const like = `%${f.q.trim().replace(/[%_]/g, "")}%`;
    conds.push(
      // ilike across name + description
      sql`(${themes.name} ilike ${like} or ${themes.description} ilike ${like} or ${themes.slug} ilike ${like})` as never,
    );
  }
  let themeIds: string[] | null = null;
  if (f.tag) {
    const rows = await db
      .select({ id: themeTags.themeId })
      .from(themeTags)
      .where(eq(themeTags.tag, f.tag));
    themeIds = rows.map((r) => r.id);
    if (themeIds.length === 0) return [];
    conds.push(inArray(themes.id, themeIds) as never);
  }

  const orderBy =
    f.sort === "name"
      ? themes.name
      : f.sort === "downloads"
        ? desc(themes.downloads)
        : f.sort === "top"
          ? desc(sql`${themes.ratingSum} - ${themes.ratingCount}`)
          : desc(themes.updatedAt);

  const rows = await db
    .select({
      theme: themes,
      authorName: users.name,
      authorUsername: users.username,
      authorImage: users.image,
    })
    .from(themes)
    .leftJoin(users, eq(users.id, themes.authorId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(orderBy)
    .limit(Math.min(f.limit ?? 24, 100))
    .offset(f.offset ?? 0);

  if (!rows.length) return [];

  const themeIdsList = rows.map((r) => r.theme.id);
  const screenshots = await db
    .select({
      versionId: themeScreenshots.versionId,
      storageKey: themeScreenshots.storageKey,
      themeId: themeVersions.themeId,
    })
    .from(themeScreenshots)
    .innerJoin(
      themeVersions,
      eq(themeVersions.id, themeScreenshots.versionId),
    )
    .where(inArray(themeVersions.themeId, themeIdsList));

  const firstScreenshotByTheme = new Map<string, string>();
  for (const s of screenshots) {
    if (!firstScreenshotByTheme.has(s.themeId)) {
      firstScreenshotByTheme.set(s.themeId, s.storageKey);
    }
  }

  const tagRows = await db
    .select({ themeId: themeTags.themeId, tag: themeTags.tag })
    .from(themeTags)
    .where(inArray(themeTags.themeId, themeIdsList));

  const tagsByTheme = new Map<string, string[]>();
  for (const t of tagRows) {
    if (!tagsByTheme.has(t.themeId)) tagsByTheme.set(t.themeId, []);
    tagsByTheme.get(t.themeId)!.push(t.tag);
  }

  return rows.map((r) => ({
    theme: r.theme,
    authorName: r.authorName,
    authorUsername: r.authorUsername,
    authorImage: r.authorImage,
    rating:
      r.theme.ratingCount > 0
        ? r.theme.ratingSum / r.theme.ratingCount
        : null,
    ratingCount: r.theme.ratingCount,
    screenshotKey: firstScreenshotByTheme.get(r.theme.id) ?? null,
    tags: tagsByTheme.get(r.theme.id) ?? [],
  }));
}

export interface ThemeDetail extends ThemeCard {
  versions: ThemeVersion[];
  latestVersion: ThemeVersion | null;
  screenshots: ThemeScreenshot[];
  authorBio: string | null;
}

export async function getThemeDetail(
  slug: string,
): Promise<ThemeDetail | null> {
  const theme = await getThemeBySlug(slug);
  if (!theme) return null;
  const [author] = await db
    .select()
    .from(users)
    .where(eq(users.id, theme.authorId))
    .limit(1);
  const versions = await listVersions(theme.id);
  const latestVersion = versions[0] ?? null;
  const screenshots = latestVersion
    ? await listScreenshots(latestVersion.id)
    : [];
  const tags = await listTags(theme.id);
  return {
    theme,
    authorName: author?.name ?? null,
    authorUsername: author?.username ?? null,
    authorImage: author?.image ?? null,
    authorBio: author?.bio ?? null,
    rating:
      theme.ratingCount > 0 ? theme.ratingSum / theme.ratingCount : null,
    ratingCount: theme.ratingCount,
    screenshotKey: screenshots[0]?.storageKey ?? null,
    tags,
    versions,
    latestVersion,
    screenshots,
  };
}

export async function rateTheme(
  themeId: string,
  userId: string,
  stars: number,
): Promise<void> {
  if (stars < 1 || stars > 5 || !Number.isInteger(stars)) {
    throw new UploadError("INVALID_INPUT", "stars must be 1-5");
  }
  const [existing] = await db
    .select()
    .from(ratings)
    .where(and(eq(ratings.themeId, themeId), eq(ratings.userId, userId)))
    .limit(1);
  if (existing) {
    await db
      .update(ratings)
      .set({ stars })
      .where(and(eq(ratings.themeId, themeId), eq(ratings.userId, userId)));
    await db
      .update(themes)
      .set({
        ratingSum: sql`${themes.ratingSum} - ${existing.stars} + ${stars}`,
      })
      .where(eq(themes.id, themeId));
  } else {
    await db.insert(ratings).values({ themeId, userId, stars });
    await db
      .update(themes)
      .set({
        ratingSum: sql`${themes.ratingSum} + ${stars}`,
        ratingCount: sql`${themes.ratingCount} + 1`,
      })
      .where(eq(themes.id, themeId));
  }
}

export async function postComment(
  themeId: string,
  authorId: string,
  body: string,
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) throw new UploadError("INVALID_INPUT", "comment is empty");
  if (trimmed.length > 4000)
    throw new UploadError("INVALID_INPUT", "comment too long");
  await db.insert(comments).values({
    id: nanoid(),
    themeId,
    authorId,
    body: trimmed,
  });
}

export async function listComments(themeId: string) {
  return db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      authorId: comments.authorId,
      authorName: users.name,
      authorUsername: users.username,
      authorImage: users.image,
    })
    .from(comments)
    .leftJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.themeId, themeId))
    .orderBy(desc(comments.createdAt));
}

export async function getCollectionsForUser(userId: string) {
  return db
    .select()
    .from(collections)
    .where(eq(collections.ownerId, userId))
    .orderBy(desc(collections.createdAt));
}

export async function getCollection(id: string) {
  const [c] = await db
    .select()
    .from(collections)
    .where(eq(collections.id, id))
    .limit(1);
  return c ?? null;
}

export async function getCollectionItems(collectionId: string) {
  return db
    .select({
      theme: themes,
    })
    .from(collectionItems)
    .innerJoin(themes, eq(themes.id, collectionItems.themeId))
    .where(eq(collectionItems.collectionId, collectionId))
    .orderBy(collectionItems.sortOrder);
}

export async function createCollection(input: {
  ownerId: string;
  name: string;
  description?: string;
  isPublic?: boolean;
}) {
  const id = nanoid();
  const slug =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "collection";
  await db.insert(collections).values({
    id,
    ownerId: input.ownerId,
    name: input.name,
    slug,
    description: input.description ?? "",
    isPublic: input.isPublic ?? true,
  });
  return id;
}

export async function addToCollection(collectionId: string, themeId: string) {
  await db
    .insert(collectionItems)
    .values({ collectionId, themeId })
    .onConflictDoNothing();
}

export async function removeFromCollection(
  collectionId: string,
  themeId: string,
) {
  await db
    .delete(collectionItems)
    .where(
      and(
        eq(collectionItems.collectionId, collectionId),
        eq(collectionItems.themeId, themeId),
      ),
    );
}

export async function searchTagSuggestions(prefix: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ tag: themeTags.tag })
    .from(themeTags)
    .where(ilike(themeTags.tag, `${prefix}%`))
    .limit(10);
  return rows.map((r) => r.tag);
}

// Convenience: bump downloads counter when an archive is fetched.
export async function incrementDownloads(themeId: string) {
  await db
    .update(themes)
    .set({ downloads: sql`${themes.downloads} + 1` })
    .where(eq(themes.id, themeId));
}

export type { ThemeManifest };
