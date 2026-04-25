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

// Hard limits, deliberately tight. See docs/security.md.
export const LIMITS = {
  maxArchiveBytes: 50 * 1024 * 1024, // 50 MB on the wire
  maxUnzippedBytes: 500 * 1024 * 1024, // 500 MB unzipped total
  maxEntryCount: 4000,
  maxEntryBytes: 50 * 1024 * 1024, // 50 MB per file
  maxCompressionRatio: 200, // guards against zip bombs
  maxScreenshotBytes: 5 * 1024 * 1024,
  maxPathLength: 255,
} as const;

// Any of these extensions (case-insensitive) inside the archive is a hard
// reject. Two buckets:
//   1. Native / installer binaries that have no legitimate place in a theme.
//   2. Windows auto-execute script types (.bat, .cmd, .ps1, etc.) — anything
//      that runs on double-click and looks like "setup.exe" by another name.
// We deliberately DO allow .js / .sh / .py because real Discord, Spicetify,
// VS Code, WM, and shell-prompt themes legitimately ship those. ClamAV
// (see clamav.ts) scans archive contents for known malware families on top.
const DENIED_EXTENSIONS = new Set<string>([
  // native binaries
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".com",
  ".msi",
  ".msp",
  ".scr",
  ".cpl",
  ".pif",
  // installers / disk images
  ".apk",
  ".jar",
  ".war",
  ".iso",
  ".img",
  ".dmg",
  ".pkg",
  ".deb",
  ".rpm",
  ".appimage",
  // windows auto-execute scripts
  ".bat",
  ".cmd",
  ".ps1",
  ".psm1",
  ".vbs",
  ".vbe",
  ".wsh",
  ".wsf",
  ".hta",
  ".reg",
]);

// Magic-byte signatures for screenshots. Empty array means "trust the ext".
const IMAGE_MAGIC: Record<string, Array<(b: Buffer) => boolean>> = {
  "image/png": [
    (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  ],
  "image/jpeg": [(b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  "image/gif": [
    (b) => b.length >= 6 && b.subarray(0, 6).toString("ascii") === "GIF87a",
    (b) => b.length >= 6 && b.subarray(0, 6).toString("ascii") === "GIF89a",
  ],
  "image/webp": [
    (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  ],
  "image/avif": [
    (b) =>
      b.length >= 12 &&
      b.subarray(4, 8).toString("ascii") === "ftyp" &&
      ["avif", "avis", "heic", "heix"].includes(b.subarray(8, 12).toString("ascii")),
  ],
  "image/svg+xml": [
    (b) => {
      const head = b.subarray(0, Math.min(b.length, 1024)).toString("utf8");
      return /<svg[\s>]/i.test(head) || /<\?xml/i.test(head);
    },
  ],
};

// Parses a zip archive in memory: extracts theme.toml, README, and any
// screenshots referenced in the manifest. Rejects path-traversal entries,
// executable files, zip bombs, and non-image screenshots.
export function extractZip(buffer: Buffer): ExtractedArchive {
  if (buffer.length > LIMITS.maxArchiveBytes) {
    throw new ArchiveError(
      "ARCHIVE_TOO_LARGE",
      `archive exceeds ${Math.floor(LIMITS.maxArchiveBytes / (1024 * 1024))} MB`,
    );
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new ArchiveError("INVALID_ARCHIVE", "could not read zip archive");
  }
  const entries = zip.getEntries();

  if (entries.length === 0) {
    throw new ArchiveError("INVALID_ARCHIVE", "archive is empty");
  }
  if (entries.length > LIMITS.maxEntryCount) {
    throw new ArchiveError(
      "ARCHIVE_TOO_MANY_ENTRIES",
      `archive has ${entries.length} entries (max ${LIMITS.maxEntryCount})`,
    );
  }

  let totalUnzipped = 0;
  for (const e of entries) {
    const name = e.entryName;

    // Path hygiene.
    if (!name || name.length > LIMITS.maxPathLength) {
      throw new ArchiveError("UNSAFE_PATH", `entry name too long or empty`);
    }
    if (name.includes("\0")) {
      throw new ArchiveError("UNSAFE_PATH", `null byte in entry name`);
    }
    if (name.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(name)) {
      throw new ArchiveError("UNSAFE_PATH", `absolute path: ${name}`);
    }
    const normalized = name.replace(/\\/g, "/");
    const parts = normalized.split("/");
    if (parts.some((p) => p === "..")) {
      throw new ArchiveError("UNSAFE_PATH", `path traversal: ${name}`);
    }
    if (parts.some((p) => p === "." && parts.length > 1)) {
      // Allow "." as the whole name (rare), but reject "./foo" sneaking in.
      throw new ArchiveError("UNSAFE_PATH", `dot-segment: ${name}`);
    }

    // Skip symlink handling — adm-zip doesn't surface symlinks specially, but
    // external-attributes bit 0xa0000000 on unix means symlink. Refuse them.
    const attr: number = (e as unknown as { attr?: number }).attr ?? 0;
    const unixMode = (attr >>> 16) & 0xffff;
    const isSymlink = (unixMode & 0xa000) === 0xa000;
    if (isSymlink) {
      throw new ArchiveError("UNSAFE_PATH", `symlink in archive: ${name}`);
    }

    if (e.isDirectory) continue;

    // Extension denylist.
    const lower = normalized.toLowerCase();
    const dot = lower.lastIndexOf(".");
    const ext = dot >= 0 ? lower.slice(dot) : "";
    if (DENIED_EXTENSIONS.has(ext)) {
      throw new ArchiveError(
        "DISALLOWED_CONTENT",
        `disallowed file type in archive: ${name} (${ext})`,
      );
    }

    // Per-entry size guard: check the declared uncompressed size cheaply
    // before we pull bytes.
    const declared = e.header?.size ?? 0;
    if (declared > LIMITS.maxEntryBytes) {
      throw new ArchiveError(
        "ENTRY_TOO_LARGE",
        `entry ${name} is ${declared} bytes (max ${LIMITS.maxEntryBytes})`,
      );
    }
    totalUnzipped += declared;
    if (totalUnzipped > LIMITS.maxUnzippedBytes) {
      throw new ArchiveError(
        "ARCHIVE_BOMB",
        `unzipped size exceeds ${Math.floor(LIMITS.maxUnzippedBytes / (1024 * 1024))} MB`,
      );
    }
  }

  // Compression-ratio guard — don't trust individual entry headers, compare
  // against the on-wire archive size.
  if (buffer.length > 0) {
    const ratio = totalUnzipped / buffer.length;
    if (ratio > LIMITS.maxCompressionRatio) {
      throw new ArchiveError(
        "ARCHIVE_BOMB",
        `compression ratio ${ratio.toFixed(1)}x exceeds ${LIMITS.maxCompressionRatio}x`,
      );
    }
  }

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
    if (bytes.length > LIMITS.maxScreenshotBytes) {
      throw new ArchiveError(
        "SCREENSHOT_TOO_LARGE",
        `screenshot too large: ${screenshot}`,
      );
    }
    const sniffers = IMAGE_MAGIC[contentType] ?? [];
    if (sniffers.length > 0 && !sniffers.some((fn) => fn(bytes))) {
      throw new ArchiveError(
        "SCREENSHOT_INVALID",
        `${screenshot} does not look like a ${contentType}`,
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
