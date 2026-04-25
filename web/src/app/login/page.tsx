import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { auth, signIn } from "@/lib/auth";
import { allowRegistration } from "@/lib/utils";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (session?.user) redirect(sp.next ?? "/");

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Welcome back.
      </p>
      <Card className="mt-6 space-y-4 p-6">
        <form
          action={async (formData) => {
            "use server";
            await signIn("credentials", {
              email: formData.get("email"),
              password: formData.get("password"),
              redirectTo: sp.next ?? "/",
            });
          }}
          className="space-y-3"
        >
          <Field name="email" label="Email" type="email" required />
          <Field name="password" label="Password" type="password" required />
          {sp.error && (
            <p className="text-sm text-red-500">
              Sign in failed. Check your credentials.
            </p>
          )}
          <button
            type="submit"
            className="h-10 w-full rounded-lg bg-[color:var(--accent)] px-4 text-sm font-medium text-[color:var(--accent-foreground)]"
          >
            Sign in
          </button>
        </form>

        {process.env.GITHUB_CLIENT_ID && (
          <>
            <div className="text-center text-xs text-[color:var(--muted)]">or</div>
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: sp.next ?? "/" });
              }}
            >
              <button
                type="submit"
                className="h-10 w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card)] text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5"
              >
                Continue with GitHub
              </button>
            </form>
          </>
        )}
      </Card>
      {allowRegistration() && (
        <p className="mt-4 text-center text-sm text-[color:var(--muted)]">
          New here?{" "}
          <Link href="/register" className="text-[color:var(--accent)] underline">
            Create an account
          </Link>
        </p>
      )}
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
