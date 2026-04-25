import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  primaryKey,
  index,
  uniqueIndex,
  jsonb,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- Auth.js core tables ----------
// (See https://authjs.dev/getting-started/adapters/drizzle)

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  username: text("username").unique(),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  bio: text("bio"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  banReason: text("ban_reason"),
  bannedAt: timestamp("banned_at"),
  showNsfw: boolean("show_nsfw").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ---------- API tokens (used by the CLI) ----------

export const apiTokens = pgTable(
  "api_token",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("api_token_user_idx").on(t.userId)],
);

// ---------- Themes ----------

export const themes = pgTable(
  "theme",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    description: text("description").notNull().default(""),
    homepage: text("homepage"),
    repository: text("repository"),
    license: text("license").notNull().default("MIT"),
    nsfw: boolean("nsfw").notNull().default(false),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    forkOfId: text("fork_of_id"),
    latestVersionId: text("latest_version_id"),
    downloads: integer("downloads").notNull().default(0),
    ratingSum: integer("rating_sum").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    hidden: boolean("hidden").notNull().default(false),
    hiddenReason: text("hidden_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("theme_type_idx").on(t.type),
    index("theme_author_idx").on(t.authorId),
    index("theme_created_idx").on(t.createdAt),
    index("theme_hidden_idx").on(t.hidden),
  ],
);

export const themeVersions = pgTable(
  "theme_version",
  {
    id: text("id").primaryKey(),
    themeId: text("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    notes: text("notes").notNull().default(""),
    manifest: jsonb("manifest").notNull(),
    archiveKey: text("archive_key").notNull(),
    archiveSize: integer("archive_size").notNull(),
    archiveSha256: text("archive_sha256").notNull(),
    readme: text("readme").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("theme_version_unique").on(t.themeId, t.version),
    index("theme_version_theme_idx").on(t.themeId),
  ],
);

export const themeScreenshots = pgTable(
  "theme_screenshot",
  {
    id: text("id").primaryKey(),
    versionId: text("version_id")
      .notNull()
      .references(() => themeVersions.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    caption: text("caption").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("theme_screenshot_version_idx").on(t.versionId)],
);

export const themeTags = pgTable(
  "theme_tag",
  {
    themeId: text("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.themeId, t.tag] }),
    index("theme_tag_tag_idx").on(t.tag),
  ],
);

// ---------- Comments / ratings / collections / follows ----------

export const comments = pgTable(
  "comment",
  {
    id: text("id").primaryKey(),
    themeId: text("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("comment_theme_idx").on(t.themeId)],
);

export const ratings = pgTable(
  "rating",
  {
    themeId: text("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.themeId, t.userId] })],
);

export const collections = pgTable("collection", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const collectionItems = pgTable(
  "collection_item",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    themeId: text("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.themeId] })],
);

export const follows = pgTable(
  "follow",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followingId] })],
);

export const reports = pgTable(
  "report",
  {
    id: text("id").primaryKey(),
    themeId: text("theme_id").references(() => themes.id, {
      onDelete: "cascade",
    }),
    commentId: text("comment_id").references(() => comments.id, {
      onDelete: "cascade",
    }),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    category: text("category").notNull().default("other"),
    // kept for backwards compatibility; `status` is the source of truth now.
    resolved: boolean("resolved").notNull().default(false),
    // open | resolved | dismissed
    status: text("status").notNull().default("open"),
    handledById: text("handled_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    handledAt: timestamp("handled_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("report_status_idx").on(t.status),
    index("report_theme_idx").on(t.themeId),
    index("report_comment_idx").on(t.commentId),
  ],
);

// Admin audit trail. Every moderator action (hide, unhide, ban, unban,
// resolve/dismiss report, delete theme/comment) writes one row here.
export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id"),
    details: jsonb("details"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_actor_idx").on(t.actorId),
    index("audit_log_created_idx").on(t.createdAt),
  ],
);

// Simple rolling-window rate limiter. `key` encodes the action and the
// identifier (user id or ip), `windowStart` is the unix-second bucket start.
// A unique index on (key, windowStart) means UPSERT increments the counter.
export const rateBuckets = pgTable(
  "rate_bucket",
  {
    key: text("key").notNull(),
    windowStart: integer("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.windowStart] }),
    index("rate_bucket_window_idx").on(t.windowStart),
  ],
);

// Upload-scan log: every archive ever accepted has one row with the
// virus-scan verdict. Lets admins audit the pipeline.
export const uploadScans = pgTable(
  "upload_scan",
  {
    id: text("id").primaryKey(),
    uploaderId: text("uploader_id").references(() => users.id, {
      onDelete: "set null",
    }),
    themeSlug: text("theme_slug"),
    archiveSha256: text("archive_sha256").notNull(),
    archiveSize: integer("archive_size").notNull(),
    verdict: text("verdict").notNull(), // clean | infected | skipped | error
    engine: text("engine"),
    signature: text("signature"),
    details: text("details"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("upload_scan_sha_idx").on(t.archiveSha256),
    index("upload_scan_verdict_idx").on(t.verdict),
    index("upload_scan_created_idx").on(t.createdAt),
  ],
);

// ---------- Relations ----------

export const usersRelations = relations(users, ({ many }) => ({
  themes: many(themes),
  comments: many(comments),
  ratings: many(ratings),
  collections: many(collections),
  apiTokens: many(apiTokens),
}));

export const themesRelations = relations(themes, ({ one, many }) => ({
  author: one(users, {
    fields: [themes.authorId],
    references: [users.id],
  }),
  versions: many(themeVersions),
  comments: many(comments),
  tags: many(themeTags),
}));

export const themeVersionsRelations = relations(
  themeVersions,
  ({ one, many }) => ({
    theme: one(themes, {
      fields: [themeVersions.themeId],
      references: [themes.id],
    }),
    screenshots: many(themeScreenshots),
  }),
);

export const themeScreenshotsRelations = relations(
  themeScreenshots,
  ({ one }) => ({
    version: one(themeVersions, {
      fields: [themeScreenshots.versionId],
      references: [themeVersions.id],
    }),
  }),
);

export const themeTagsRelations = relations(themeTags, ({ one }) => ({
  theme: one(themes, {
    fields: [themeTags.themeId],
    references: [themes.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  theme: one(themes, {
    fields: [comments.themeId],
    references: [themes.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  owner: one(users, {
    fields: [collections.ownerId],
    references: [users.id],
  }),
  items: many(collectionItems),
}));

export const collectionItemsRelations = relations(
  collectionItems,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionItems.collectionId],
      references: [collections.id],
    }),
    theme: one(themes, {
      fields: [collectionItems.themeId],
      references: [themes.id],
    }),
  }),
);

// Useful aggregated row types used by the UI layer.
export type Theme = typeof themes.$inferSelect;
export type NewTheme = typeof themes.$inferInsert;
export type ThemeVersion = typeof themeVersions.$inferSelect;
export type NewThemeVersion = typeof themeVersions.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type ThemeScreenshot = typeof themeScreenshots.$inferSelect;
export type ApiToken = typeof apiTokens.$inferSelect;

// also export types as pseudo-records for jsonb columns
export type ThemeManifest = {
  theme: {
    name: string;
    slug: string;
    type: string;
    version: string;
    license: string;
    description: string;
    authors: string[];
    tags: string[];
    nsfw?: boolean;
    homepage?: string;
    repository?: string;
    screenshots?: string[];
    readme?: string;
  };
  install?: {
    target?: string;
    entrypoint?: string;
    pre?: string[];
    post?: string[];
  };
};

// re-export ratings for relation lookups
export const ratingsRelations = relations(ratings, ({ one }) => ({
  theme: one(themes, {
    fields: [ratings.themeId],
    references: [themes.id],
  }),
  user: one(users, {
    fields: [ratings.userId],
    references: [users.id],
  }),
}));

// Suppress unused warnings for `real` import (kept for future use).
const _real = real;
void _real;
