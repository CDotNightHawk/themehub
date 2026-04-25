import Link from "next/link";
import { signOut } from "@/lib/auth";
import { siteName } from "@/lib/utils";
import { Button } from "./ui";

interface HeaderUser {
  name: string | null;
  username: string | null;
  image: string | null;
  isAdmin: boolean;
}

export function SiteHeader({ user }: { user: HeaderUser | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--card-border)] bg-[color:var(--background)]/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-lg bg-[color:var(--accent)] text-[color:var(--accent-foreground)] text-sm"
          >
            🐾
          </span>
          {siteName()}
        </Link>
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          <NavLink href="/themes">Browse</NavLink>
          <NavLink href="/categories">Categories</NavLink>
          <NavLink href="/collections">Collections</NavLink>
          <NavLink href="/docs">Docs</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/themes/new">
                <Button size="sm">Upload</Button>
              </Link>
              <Link
                href={`/u/${user.username ?? ""}`}
                className="hidden items-center gap-2 rounded-full border border-[color:var(--card-border)] py-1 pr-3 pl-1 text-sm sm:inline-flex"
              >
                <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-[color:var(--card)]">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs">
                      {(user.name ?? user.username ?? "?")
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                  )}
                </span>
                {user.username ?? "you"}
              </Link>
              {user.isAdmin && (
                <Link
                  href="/admin"
                  className="hidden text-xs text-[color:var(--muted)] sm:inline"
                >
                  admin
                </Link>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-[color:var(--muted)] hover:bg-black/5 hover:text-[color:var(--foreground)] dark:hover:bg-white/5"
    >
      {children}
    </Link>
  );
}
