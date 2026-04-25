// Seed script. Creates an admin user (if ADMIN_USERS is set) and a couple of
// example themes from the repo's `examples/` directory so a fresh instance
// has something to look at.

import path from "node:path";
import { promises as fs } from "node:fs";
import AdmZip from "adm-zip";
import bcrypt from "bcryptjs";
import slugify from "slugify";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";
import { uploadTheme } from "@/server/themes";
import { adminEmails } from "@/lib/utils";

async function main() {
  // 1. Ensure an admin user exists. If ADMIN_USERS is set, the first email is
  //    used. Otherwise create a default `demo@themehub.local` user with
  //    password `themehubdemo` purely so a fresh dev instance has a login.
  const admin = adminEmails().values().next().value ?? "demo@themehub.local";
  const username = slugify(admin.split("@")[0], {
    lower: true,
    strict: true,
  });

  let user = (
    await db.select().from(users).where(eq(users.email, admin)).limit(1)
  )[0];
  if (!user) {
    const id = nanoid();
    await db.insert(users).values({
      id,
      email: admin,
      username,
      name: username,
      passwordHash: await bcrypt.hash("themehubdemo", 10),
      isAdmin: true,
    });
    user = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
    console.log(
      `Created admin user ${admin} (password: themehubdemo). Change it!`,
    );
  } else {
    console.log(`Admin user ${admin} already exists.`);
  }

  // 2. Walk examples/ and upload each as a theme (idempotent — uploadTheme
  //    rejects same-or-lower versions). We zip the directory in memory.
  const examplesRoot = path.resolve(process.cwd(), "..", "examples", "themes");
  let entries: string[] = [];
  try {
    entries = await fs.readdir(examplesRoot);
  } catch {
    console.log(`No examples/themes directory at ${examplesRoot} — skipping.`);
    return;
  }
  for (const entry of entries) {
    const themeDir = path.join(examplesRoot, entry);
    const stat = await fs.stat(themeDir);
    if (!stat.isDirectory()) continue;

    const zip = new AdmZip();
    await addDirToZip(zip, themeDir, "");
    const buf = zip.toBuffer();

    try {
      const r = await uploadTheme({
        archive: buf,
        notes: "seed import",
        uploaderId: user.id,
      });
      console.log(`Seeded theme ${r.theme.slug}@${r.version.version}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Already exists with same/greater version — fine.
      if (msg.toLowerCase().includes("version")) {
        console.log(`Skipped ${entry}: ${msg}`);
      } else {
        console.warn(`Failed to seed ${entry}: ${msg}`);
      }
    }
  }
}

async function addDirToZip(
  zip: AdmZip,
  dir: string,
  prefix: string,
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await addDirToZip(zip, full, rel);
    } else {
      const data = await fs.readFile(full);
      zip.addFile(rel, data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
