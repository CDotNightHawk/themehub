import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateBuckets } from "@/db/schema";

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; retryAfter: number; resetAt: number };

// Simple fixed-window rate limiter backed by the `rate_bucket` table. Pure
// Postgres, no Redis dependency. Accuracy is good enough for abuse prevention
// on a small theme hub — the window edges double-count by design.
export async function rateLimit(args: {
  action: string;
  identifier: string;
  max: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const key = `${args.action}:${args.identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / args.windowSeconds) * args.windowSeconds;
  const resetAt = windowStart + args.windowSeconds;

  // Upsert the counter for this window.
  await db
    .insert(rateBuckets)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateBuckets.key, rateBuckets.windowStart],
      set: { count: sql`${rateBuckets.count} + 1` },
    });

  const [row] = await db
    .select({ count: rateBuckets.count })
    .from(rateBuckets)
    .where(and(eq(rateBuckets.key, key), eq(rateBuckets.windowStart, windowStart)))
    .limit(1);

  const count = row?.count ?? 1;

  if (count > args.max) {
    return {
      allowed: false,
      retryAfter: Math.max(1, resetAt - now),
      resetAt,
    };
  }
  return {
    allowed: true,
    remaining: Math.max(0, args.max - count),
    resetAt,
  };
}

// Periodic cleanup — can be called from a cron or during low-traffic routes.
// Not strictly necessary; rows are harmless but grow without bound.
export async function pruneRateBuckets(
  keepSeconds = 60 * 60 * 24,
): Promise<void> {
  const cutoff = Math.floor(Date.now() / 1000) - keepSeconds;
  await db.delete(rateBuckets).where(lt(rateBuckets.windowStart, cutoff));
}

export function identifierFromRequest(req: Request, userId: string | null): string {
  if (userId) return `u:${userId}`;
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return `ip:${fwd.split(",")[0].trim()}`;
  return "ip:unknown";
}

// Common bucket definitions. Keep tight — abuse prevention, not DoS mitigation.
export const BUCKETS = {
  upload: { max: 10, windowSeconds: 60 * 60 }, // 10/hr/user
  comment: { max: 20, windowSeconds: 60 * 5 }, // 20/5min/user
  register: { max: 5, windowSeconds: 60 * 60 }, // 5/hr/ip
  report: { max: 30, windowSeconds: 60 * 60 * 24 }, // 30/day/user
  login: { max: 20, windowSeconds: 60 * 10 }, // 20/10min/ip
} as const;
