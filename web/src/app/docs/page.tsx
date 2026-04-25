import Link from "next/link";
import { Card } from "@/components/ui";

export const metadata = { title: "Docs" };

export default function DocsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 prose-themehub">
      <h1 className="text-2xl font-semibold tracking-tight">Docs</h1>
      <p className="text-sm text-[color:var(--muted)]">
        Everything you need to publish, install, and host themes on themehub.
      </p>

      <h2 id="manifest">Theme manifest (<code>theme.toml</code>)</h2>
      <p>
        Every theme is a zip archive with a <code>theme.toml</code> at its root.
        See the
        {" "}
        <Link
          href="https://github.com/CDotNightHawk/themehub/blob/main/docs/theme-spec.md"
          className="underline"
        >
          full spec
        </Link>
        . Minimal example:
      </p>
      <pre>
{`[theme]
name = "Furry GRUB Dark"
slug = "furry-grub-dark"
type = "grub"
version = "1.0.0"
license = "CC-BY-SA-4.0"
description = "A dark GRUB theme with paw prints and neon accents."
authors = ["NightHawk"]
tags = ["furry", "dark", "neon"]
nsfw = false

[install]
target = "/boot/grub/themes/furry-grub-dark"
entrypoint = "theme.txt"
`}
      </pre>

      <h2 id="cli">CLI</h2>
      <p>
        Install the <code>themehub</code> binary from this hub or build it
        yourself with <code>cargo build --release</code> from the
        {" "}
        <Link
          href="https://github.com/CDotNightHawk/themehub/tree/main/cli"
          className="underline"
        >
          cli/
        </Link>{" "}
        directory. Common commands:
      </p>
      <pre>
{`themehub login
themehub search furry grub
themehub install furry-grub-dark
themehub install furry-grub-dark --target ~/my-grub-theme
themehub list
`}
      </pre>

      <h2 id="api">REST API</h2>
      <p>
        The hub exposes a versioned API at <code>/api/v1</code>. Read endpoints
        are public; write endpoints require a Bearer token from{" "}
        <Link href="/settings/tokens" className="underline">
          Settings → API tokens
        </Link>
        . Full reference is in
        {" "}
        <Link
          href="https://github.com/CDotNightHawk/themehub/blob/main/docs/api.md"
          className="underline"
        >
          docs/api.md
        </Link>
        .
      </p>

      <h2 id="self-host">Self-hosting</h2>
      <Card className="p-4">
        <p className="my-0">
          The fastest path is{" "}
          <code>cp .env.example .env &amp;&amp; docker compose up -d</code>. The
          repo also exposes a Nix flake with a <code>nixosModules.default</code>
          {" "}
          for a one-line declarative deploy. Full guide:{" "}
          <Link
            href="https://github.com/CDotNightHawk/themehub/blob/main/docs/self-hosting.md"
            className="underline"
          >
            docs/self-hosting.md
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
