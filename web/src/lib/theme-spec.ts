import { parse as parseToml } from "smol-toml";
import { z } from "zod";
import slugify from "slugify";
import { isValidThemeType } from "./categories";
import type { ThemeManifest } from "@/db/schema";

const semverRegex = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const slugRegex = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export const ManifestSchema = z.object({
  theme: z.object({
    name: z.string().min(1).max(120),
    slug: z.string().regex(slugRegex, "slug must be kebab-case [a-z0-9-]"),
    type: z.string().refine(isValidThemeType, {
      message: "unknown theme type",
    }),
    version: z.string().regex(semverRegex, "must be semver (x.y.z)"),
    license: z.string().min(1).max(80),
    description: z.string().min(1).max(4000),
    authors: z.array(z.string().min(1)).min(1),
    tags: z.array(z.string()).default([]),
    nsfw: z.boolean().default(false),
    homepage: z.string().url().optional(),
    repository: z.string().url().optional(),
    screenshots: z.array(z.string()).default([]),
    readme: z.string().optional(),
  }),
  install: z
    .object({
      target: z.string().optional(),
      entrypoint: z.string().optional(),
      pre: z.array(z.string()).default([]),
      post: z.array(z.string()).default([]),
    })
    .optional(),
});

export type ParsedManifest = z.infer<typeof ManifestSchema>;

export function parseManifest(toml: string): ParsedManifest {
  const raw = parseToml(toml);
  const parsed = ManifestSchema.parse(raw);
  // Normalise tags: lowercase, dedupe, max 12.
  const tags = Array.from(
    new Set(parsed.theme.tags.map((t) => t.toLowerCase().trim())),
  )
    .filter(Boolean)
    .slice(0, 12);
  parsed.theme.tags = tags;
  parsed.theme.slug = parsed.theme.slug.toLowerCase();
  return parsed;
}

export function manifestToRecord(m: ParsedManifest): ThemeManifest {
  return {
    theme: { ...m.theme },
    install: m.install,
  };
}

export function suggestSlug(name: string): string {
  return slugify(name, { lower: true, strict: true }).slice(0, 64);
}

export class ManifestError extends Error {
  constructor(
    message: string,
    public readonly issues?: unknown,
  ) {
    super(message);
    this.name = "ManifestError";
  }
}

export function safeParseManifest(toml: string): {
  ok: true;
  manifest: ParsedManifest;
} | {
  ok: false;
  error: string;
  issues?: z.ZodIssue[];
} {
  try {
    const raw = parseToml(toml);
    const result = ManifestSchema.safeParse(raw);
    if (!result.success) {
      const first = result.error.issues[0];
      return {
        ok: false,
        error: first
          ? `${first.path.join(".") || "root"}: ${first.message}`
          : "invalid manifest",
        issues: result.error.issues,
      };
    }
    const manifest = result.data;
    manifest.theme.tags = Array.from(
      new Set(manifest.theme.tags.map((t) => t.toLowerCase().trim())),
    )
      .filter(Boolean)
      .slice(0, 12);
    manifest.theme.slug = manifest.theme.slug.toLowerCase();
    return { ok: true, manifest };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "failed to parse TOML",
    };
  }
}

// Compare two semvers; returns >0 if `a` > `b`, <0 if `a` < `b`, 0 if equal.
// Pre-release / build metadata are ignored for ordering simplicity.
export function compareSemver(a: string, b: string): number {
  const norm = (v: string) =>
    v
      .split(/[-+]/)[0]
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const [a1, a2, a3] = norm(a);
  const [b1, b2, b3] = norm(b);
  return a1 - b1 || a2 - b2 || a3 - b3;
}
