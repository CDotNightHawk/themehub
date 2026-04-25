import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const userId = await requireUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "missing or invalid token" } },
      { status: 401 },
    );
  }
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "user not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    isAdmin: u.isAdmin,
  });
}
