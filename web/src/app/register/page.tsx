import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui";
import { auth, signIn } from "@/lib/auth";
import { allowRegistration } from "@/lib/utils";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import slugify from "slugify";
import { nanoid } from "nanoid";
import { adminEmails } from "@/lib/utils";

export const metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (session?.user) redirect("/");
  if (!allowRegistration()) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold">Registration is closed</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          This instance has registration disabled. Ask the admin for an invite,
          or sign in if you already have an account.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-[color:var(--accent)] underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Pick a username, you can change your display name later.
      </p>
      <Card className="mt-6 space-y-4 p-6">
        <form
          action={async (formData) => {
            "use server";
            const name = String(formData.get("name") ?? "").trim();
            const email = String(formData.get("email") ?? "").trim().toLowerCase();
            const username = slugify(
              String(formData.get("username") ?? "").trim() || name || email.split("@")[0],
              { lower: true, strict: true },
            ).slice(0, 24);
            const password = String(formData.get("password") ?? "");

            if (!email || !password || password.length < 8 || !username) {
              redirect("/register?error=invalid");
            }
            const [existing] = await db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.email, email))
              .limit(1);
            if (existing) {
              redirect("/register?error=exists");
            }
            const [existingUser] = await db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.username, username))
              .limit(1);
            if (existingUser) {
              redirect("/register?error=username-taken");
            }
            const isAdmin = adminEmails().has(email);
            await db.insert(users).values({
              id: nanoid(),
              email,
              username,
              name: name || username,
              passwordHash: await bcrypt.hash(password, 10),
              isAdmin,
            });
            revalidatePath("/");
            await signIn("credentials", {
              email,
              password,
              redirectTo: "/",
            });
          }}
          className="space-y-3"
        >
          <Field name="name" label="Display name" />
          <Field name="username" label="Username" required />
          <Field name="email" label="Email" type="email" required />
          <Field name="password" label="Password (8+ chars)" type="password" required />
          {sp.error && (
            <p className="text-sm text-red-500">
              {sp.error === "exists"
                ? "An account with that email already exists."
                : sp.error === "username-taken"
                  ? "Username is already taken."
                  : "Please fill out every field correctly."}
            </p>
          )}
          <button
            type="submit"
            className="h-10 w-full rounded-lg bg-[color:var(--accent)] px-4 text-sm font-medium text-[color:var(--accent-foreground)]"
          >
            Create account
          </button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-[color:var(--muted)]">
        Already have one?{" "}
        <Link href="/login" className="text-[color:var(--accent)] underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="h-10 w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card)] px-3 text-sm outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/30"
      />
    </label>
  );
}
