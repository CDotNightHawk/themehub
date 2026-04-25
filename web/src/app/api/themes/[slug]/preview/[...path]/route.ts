import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import {
  getThemeBySlug,
  getLatestVersion,
} from "@/server/themes";
import { getStorage } from "@/lib/storage";

const PREVIEW_EXTS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
};

// Serves a single file out of the latest version's archive, used by the
// in-page theme preview (icon grids, plymouth frames, grub mock).
// Only files with image extensions are served, to avoid turning this into a
// general-purpose archive browser.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string; path: string[] }> },
) {
  const { slug, path: pathParts } = await ctx.params;
  if (!pathParts || pathParts.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const rel = pathParts.join("/");
  if (rel.includes("..")) {
    return NextResponse.json({ error: "bad path" }, { status: 400 });
  }
  const lower = rel.toLowerCase();
  const extStart = lower.lastIndexOf(".");
  const ext = extStart >= 0 ? lower.slice(extStart) : "";
  const contentType = PREVIEW_EXTS[ext];
  if (!contentType) {
    return NextResponse.json({ error: "unsupported type" }, { status: 400 });
  }

  const theme = await getThemeBySlug(slug);
  if (!theme) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const latest = await getLatestVersion(theme.id);
  if (!latest) {
    return NextResponse.json({ error: "no versions" }, { status: 404 });
  }

  const buf = await getStorage().get(latest.archiveKey);
  const zip = new AdmZip(buf);
  const entry = zip.getEntries().find((e) => {
    if (e.isDirectory) return false;
    const name = e.entryName.replace(/^\/+/, "");
    return name.toLowerCase() === lower;
  });
  if (!entry) {
    return NextResponse.json({ error: "file not in archive" }, { status: 404 });
  }

  const bytes = entry.getData();
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=3600, immutable",
      "content-length": String(bytes.length),
    },
  });
}
