import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import {
  auditLog,
  comments,
  reports,
  themes,
  uploadScans,
  users,
} from "@/db/schema";
import type { ReportCategory } from "./moderation-categories";

export {
  REPORT_CATEGORIES,
  isReportCategory,
  type ReportCategory,
} from "./moderation-categories";

export async function createThemeReport(args: {
  themeId: string;
  reporterId: string;
  category: ReportCategory;
  reason: string;
}) {
  await db.insert(reports).values({
    id: nanoid(),
    themeId: args.themeId,
    commentId: null,
    reporterId: args.reporterId,
    category: args.category,
    reason: args.reason.slice(0, 2000),
    status: "open",
  });
}

export async function createCommentReport(args: {
  commentId: string;
  reporterId: string;
  category: ReportCategory;
  reason: string;
}) {
  await db.insert(reports).values({
    id: nanoid(),
    themeId: null,
    commentId: args.commentId,
    reporterId: args.reporterId,
    category: args.category,
    reason: args.reason.slice(0, 2000),
    status: "open",
  });
}

export async function setReportStatus(args: {
  reportId: string;
  status: "resolved" | "dismissed";
  handledById: string;
}) {
  await db
    .update(reports)
    .set({
      status: args.status,
      resolved: args.status === "resolved",
      handledById: args.handledById,
      handledAt: new Date(),
    })
    .where(eq(reports.id, args.reportId));
}

export async function setThemeHidden(args: {
  themeId: string;
  hidden: boolean;
  reason?: string | null;
}) {
  await db
    .update(themes)
    .set({
      hidden: args.hidden,
      hiddenReason: args.hidden ? args.reason ?? null : null,
      updatedAt: new Date(),
    })
    .where(eq(themes.id, args.themeId));
}

export async function setUserBanned(args: {
  userId: string;
  banned: boolean;
  reason?: string | null;
}) {
  await db
    .update(users)
    .set({
      isBanned: args.banned,
      banReason: args.banned ? args.reason ?? null : null,
      bannedAt: args.banned ? new Date() : null,
    })
    .where(eq(users.id, args.userId));
}

export async function writeAudit(args: {
  actorId: string;
  action: string;
  subjectType: string;
  subjectId?: string | null;
  details?: Record<string, unknown> | null;
}) {
  await db.insert(auditLog).values({
    id: nanoid(),
    actorId: args.actorId,
    action: args.action,
    subjectType: args.subjectType,
    subjectId: args.subjectId ?? null,
    details: args.details ?? null,
  });
}

export async function recordUploadScan(args: {
  uploaderId: string | null;
  themeSlug: string | null;
  archiveSha256: string;
  archiveSize: number;
  verdict: "clean" | "infected" | "skipped" | "error";
  engine?: string | null;
  signature?: string | null;
  details?: string | null;
}) {
  await db.insert(uploadScans).values({
    id: nanoid(),
    uploaderId: args.uploaderId,
    themeSlug: args.themeSlug,
    archiveSha256: args.archiveSha256,
    archiveSize: args.archiveSize,
    verdict: args.verdict,
    engine: args.engine ?? null,
    signature: args.signature ?? null,
    details: args.details ?? null,
  });
}

export async function listOpenReports(limit = 50) {
  return db
    .select({
      report: reports,
      themeSlug: themes.slug,
      themeName: themes.name,
      reporterUsername: users.username,
    })
    .from(reports)
    .leftJoin(themes, eq(themes.id, reports.themeId))
    .leftJoin(users, eq(users.id, reports.reporterId))
    .where(eq(reports.status, "open"))
    .orderBy(desc(reports.createdAt))
    .limit(limit);
}

export async function listRecentAudit(limit = 100) {
  return db
    .select({
      entry: auditLog,
      actorUsername: users.username,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

export async function listRecentScans(limit = 50) {
  return db
    .select()
    .from(uploadScans)
    .orderBy(desc(uploadScans.createdAt))
    .limit(limit);
}

export async function listReportsForTheme(themeId: string) {
  return db
    .select()
    .from(reports)
    .where(and(eq(reports.themeId, themeId), eq(reports.status, "open")));
}

export async function countOpenReports(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(reports)
    .where(eq(reports.status, "open"));
  return Number(row?.n ?? 0);
}

export async function commentById(id: string) {
  const [c] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
  return c ?? null;
}
