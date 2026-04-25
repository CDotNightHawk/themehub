import AdmZip from "adm-zip";
import crypto from "node:crypto";
import { safeParseManifest, type ParsedManifest } from "@/lib/theme-spec";

export interface ExtractedArchive {
  manifest: ParsedManifest;
  readme: string;
  screenshots: Array<{ path: string; bytes: Buffer; contentType: string }>;
  archiveBuffer: Buffer;
  archiveSha256: string;
}

const IMAGE_EXT_TO_TYPE: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

// Parses a zip archive in memory: extracts theme.toml, README, and any
// screenshots referenced in the manifest. Rejects path-traversal entries.
export function extractZip(buffer: Buffer): ExtractedArchive {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  let manifestText: string | null = null;
  for (const e of entries) {
    if (!e.isDirectory && stripRoot(e.entryName) === "theme.toml") {
      manifestText = e.getData().toString("utf8");
      break;
    }
  }
  if (!manifestText) {
    throw new ArchiveError("INVALID_MANIFEST", "theme.toml not found at archive root");
  }

  const parsed = safeParseManifest(manifestText);
  if (!parsed.ok) {
    throw new ArchiveError("INVALID_MANIFEST", parsed.error);
  }
  const manifest = parsed.manifest;

  // Validate every entry: no path traversal, reasonable filenames.
  for (const e of entries) {
    const name = e.entryName;
    if (name.includes("..") || name.startsWith("/")) {
      throw new ArchiveError(
        "INVALID_MANIFEST",
        `unsafe path in archive: ${name}`,
      );
    }
  }

  const readmePath = manifest.theme.readme ?? "README.md";
  let readme = "";
  for (const e of entries) {
    if (
      !e.isDirectory &&
      stripRoot(e.entryName).toLowerCase() === readmePath.toLowerCase()
    ) {
      readme = e.getData().toString("utf8");
      break;
    }
  }

  const screenshots: ExtractedArchive["screenshots"] = [];
  for (const screenshot of manifest.theme.screenshots) {
    const lower = screenshot.toLowerCase();
    const found = entries.find(
      (e) => !e.isDirectory && stripRoot(e.entryName).toLowerCase() === lower,
    );
    if (!found) continue;
    const ext = lower.slice(lower.lastIndexOf("."));
    const contentType = IMAGE_EXT_TO_TYPE[ext];
    if (!contentType) continue;
    const bytes = found.getData();
    if (bytes.length > 5 * 1024 * 1024) {
      throw new ArchiveError(
        "INVALID_MANIFEST",
        `screenshot too large: ${screenshot}`,
      );
    }
    screenshots.push({ path: screenshot, bytes, contentType });
  }

  const sha = crypto.createHash("sha256").update(buffer).digest("hex");
  return {
    manifest,
    readme,
    screenshots,
    archiveBuffer: buffer,
    archiveSha256: sha,
  };
}

// Some uploaders zip a folder; collapse leading top-level directory if every
// entry shares it. We treat the manifest as living at the *effective* root.
function stripRoot(name: string): string {
  return name.replace(/^\/+/, "");
}

export class ArchiveError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ArchiveError";
  }
}
