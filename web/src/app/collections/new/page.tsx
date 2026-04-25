import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { auth } from "@/lib/auth";
import { createCollection } from "@/server/themes";

export const metadata = { title: "New collection" };

export default async function NewCollectionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/collections/new");
  const userId = session.user.id;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">New collection</h1>
      <Card className="mt-6 p-6">
        <form
          action={async (formData) => {
            "use server";
            const name = String(formData.get("name") ?? "").trim();
            const description = String(
              formData.get("description") ?? "",
            ).trim();
            const isPublic = formData.get("public") === "on";
            if (!name) return;
            const id = await createCollection({
              ownerId: userId,
              name,
              description,
              isPublic,
            });
            redirect(`/collections/${id}`);
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Name</span>
            <input
              name="name"
              required
              className="h-10 w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card)] px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Description
            </span>
            <textarea
              name="description"
              className="min-h-24 w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card)] p-3 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="public" defaultChecked /> Public
          </label>
          <button className="h-10 w-full rounded-lg bg-[color:var(--accent)] text-sm font-medium text-[color:var(--accent-foreground)]">
            Create collection
          </button>
        </form>
      </Card>
    </div>
  );
}
