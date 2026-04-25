import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui";
import { auth } from "@/lib/auth";
import { UploadForm } from "./upload-form";

export const metadata = { title: "Upload a theme" };

export default async function UploadPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/themes/new");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Upload a theme</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Drop a zip archive containing a <code>theme.toml</code> at its root.
        Read the{" "}
        <Link href="/docs#manifest" className="underline">
          manifest spec
        </Link>{" "}
        if you&apos;re writing one for the first time.
      </p>

      <Card className="mt-6 p-6">
        <UploadForm />
      </Card>

      <Card className="mt-6 p-6 text-sm text-[color:var(--muted)]">
        <strong className="text-[color:var(--foreground)]">Heads up:</strong>{" "}
        themes are versioned by semver. If you upload a slug you already own,
        the version inside <code>theme.toml</code> must be greater than your
        previously published one.
      </Card>
    </div>
  );
}
