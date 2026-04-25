import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { addScreenshots, UploadError } from "@/server/themes";

const IMAGE_EXTS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
};

// Append extra screenshots to an existing theme's latest version.
// multipart/form-data with field `images` (multiple allowed).
export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const userId = await requireUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "sign in required" } },
      { status: 401 },
    );
  }
  const { slug } = await ctx.params;
  const form = await req.formData();
  const files = form.getAll("images");
  const prepared: Array<{ bytes: Buffer; contentType: string; ext: string }> =
    [];
  for (const f of files) {
    if (!(f instanceof File)) continue;
    const ext = IMAGE_EXTS[f.type];
    if (!ext) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: `unsupported image type: ${f.type || "unknown"}`,
          },
        },
        { status: 400 },
      );
    }
    const bytes = Buffer.from(await f.arrayBuffer());
    prepared.push({ bytes, contentType: f.type, ext });
  }
  if (prepared.length === 0) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "no images uploaded" } },
      { status: 400 },
    );
  }
  try {
    const added = await addScreenshots(slug, userId, prepared);
    return NextResponse.json({ added });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    throw err;
  }
}
