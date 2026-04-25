import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

type Provider = NonNullable<NextAuthConfig["providers"]>[number];
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import slugify from "slugify";
import { eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/db/schema";
import { adminEmails } from "./utils";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string | null;
      isAdmin: boolean;
      isBanned: boolean;
      showNsfw: boolean;
    } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

const providers: Provider[] = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      if (!user || !user.passwordHash) return null;
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;
      // Banned users cannot sign in. Returning null here surfaces the same
      // generic "invalid credentials" error — we don't leak that the account
      // exists.
      if (user.isBanned) return null;
      return {
        id: user.id,
        email: user.email!,
        name: user.name ?? user.username ?? user.email!,
        image: user.image ?? null,
      };
    },
  }),
];

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  );
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  providers,
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  callbacks: {
    // Final gate for all providers. Banned users — including via GitHub OAuth
    // — are refused here so the ban covers every sign-in path.
    async signIn({ user }) {
      if (!user?.id) return true;
      const [u] = await db
        .select({ isBanned: users.isBanned })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      if (u?.isBanned) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id ?? token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      const id = (token.userId as string | undefined) ?? token.sub;
      if (!id) return session;
      const [u] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (!u) return session;
      session.user.id = u.id;
      session.user.username = u.username;
      session.user.isAdmin = u.isAdmin;
      session.user.isBanned = u.isBanned;
      session.user.showNsfw = u.showNsfw;
      session.user.name = u.name ?? u.username ?? u.email ?? "";
      session.user.email = u.email ?? "";
      session.user.image = u.image ?? null;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      const email = (user.email ?? "").toLowerCase();
      const isAdmin = email && adminEmails().has(email);
      const username = await ensureUsername(user.id, user.name, email);
      await db
        .update(users)
        .set({
          email: email || undefined,
          username,
          isAdmin: !!isAdmin,
        })
        .where(eq(users.id, user.id));
    },
  },
});

async function ensureUsername(
  userId: string,
  name?: string | null,
  email?: string | null,
): Promise<string> {
  const base = slugify(name ?? email?.split("@")[0] ?? "user", {
    lower: true,
    strict: true,
  }).slice(0, 24) || "user";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i}`;
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  return `${base}-${nanoid(6)}`;
}

// Helper used by API route handlers that accept either session cookies or
// `Authorization: Bearer <api-token>`. Banned users are rejected at this
// layer too so CLI / API access is disabled on ban.
export async function requireUserId(req: Request): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) {
    if (session.user.isBanned) return null;
    return session.user.id;
  }
  const authz = req.headers.get("authorization");
  if (!authz?.startsWith("Bearer ")) return null;
  const token = authz.slice("Bearer ".length).trim();
  if (!token) return null;
  const { apiTokens } = await import("@/db/schema");
  const hash = await bcrypt.hash(token, 4); // never used; we look up by listing
  void hash;
  const all = await db.select().from(apiTokens);
  for (const t of all) {
    if (await bcrypt.compare(token, t.tokenHash)) {
      const [owner] = await db
        .select({ isBanned: users.isBanned })
        .from(users)
        .where(eq(users.id, t.userId))
        .limit(1);
      if (owner?.isBanned) return null;
      await db
        .update(apiTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiTokens.id, t.id));
      return t.userId;
    }
  }
  return null;
}

export async function getUserByLogin(
  login: string,
): Promise<typeof users.$inferSelect | null> {
  const [u] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, login.toLowerCase()), eq(users.username, login)))
    .limit(1);
  return u ?? null;
}
