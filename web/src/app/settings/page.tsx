import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/settings");
  const userId = session.user.id;
  const [me] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!me) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold">Profile</h2>
        <form
          action={async (formData) => {
            "use server";
            const name = String(formData.get("name") ?? "").trim();
            const bio = String(formData.get("bio") ?? "").trim();
            const showNsfw = formData.get("show_nsfw") === "on";
            await db
              .update(users)
              .set({ name, bio, showNsfw })
              .where(eq(users.id, userId));
            revalidatePath("/settings");
            revalidatePath(`/u/${me.username ?? ""}`);
          }}
          className="mt-4 space-y-4"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Display name</span>
            <input
              name="name"
              defaultValue={me.name ?? ""}
              className="h-10 w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card)] px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Bio</span>
            <textarea
              name="bio"
              defaultValue={me.bio ?? ""}
              className="min-h-24 w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card)] p-3 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="show_nsfw"
              defaultChecked={me.showNsfw}
            />{" "}
            Show NSFW themes in browse
          </label>
          <button className="h-10 rounded-lg bg-[color:var(--accent)] px-4 text-sm font-medium text-[color:var(--accent-foreground)]">
            Save
          </button>
        </form>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold">API tokens</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Tokens let the CLI publish on your behalf.
        </p>
        <Link
          href="/settings/tokens"
          className="mt-3 inline-block text-[color:var(--accent)] underline"
        >
          Manage tokens →
        </Link>
      </Card>
    </div>
  );
}
