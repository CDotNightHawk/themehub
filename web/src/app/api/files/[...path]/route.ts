import { NextResponse } from "next/server";
import { getStorage, isLocalStorage } from "@/lib/storage";
import path from "node:path";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".zip": "application/zip",
  ".toml": "text/plain",
  ".md": "text/markdown",
};

// Serves files from the local-FS storage driver. When STORAGE_DRIVER=s3 the
// app instead returns presigned URLs and never hits this route.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  if (!isLocalStorage()) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "files endpoint disabled" } },
      { status: 404 },
    );
  }
  const { path: parts } = await ctx.params;
  const key = parts.join("/").replace(/\.\./g, "");
  if (!key) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "missing path" } },
      { status: 404 },
    );
  }
  try {
    const buf = await getStorage().get(key);
    const ext = path.extname(key).toLowerCase();
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "file not found" } },
      { status: 404 },
    );
  }
}
