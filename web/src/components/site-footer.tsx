import Link from "next/link";
import { siteName } from "@/lib/utils";

export function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--card-border)] bg-[color:var(--card)]/30 py-8 text-sm text-[color:var(--muted)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {siteName()} — community theme hub. Self-host with the
          <Link
            href="https://github.com/CDotNightHawk/themehub"
            className="ml-1 text-[color:var(--accent)] underline"
          >
            source on GitHub
          </Link>
          .
        </div>
        <nav className="flex gap-4">
          <Link href="/docs" className="hover:underline">
            Docs
          </Link>
          <Link href="/docs#api" className="hover:underline">
            API
          </Link>
          <Link href="/docs#cli" className="hover:underline">
            CLI
          </Link>
          <Link href="/about" className="hover:underline">
            About
          </Link>
        </nav>
      </div>
    </footer>
  );
}
