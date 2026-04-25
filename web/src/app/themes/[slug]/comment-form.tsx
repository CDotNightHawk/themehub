"use client";
import { useTransition, useState } from "react";
import { Button, Textarea } from "@/components/ui";
import { useRouter } from "next/navigation";

export function CommentForm({ slug }: { slug: string }) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await fetch(`/api/themes/${slug}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
          });
          if (!res.ok) {
            const j = (await res.json().catch(() => null)) as {
              error?: { message?: string };
            } | null;
            setError(j?.error?.message ?? "failed to post");
            return;
          }
          setBody("");
          router.refresh();
        });
      }}
      className="space-y-2"
    >
      <Textarea
        placeholder="Share thoughts, ask questions, post a screenshot of your install…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={1}
      />
      <div className="flex items-center justify-between gap-2">
        {error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : (
          <span />
        )}
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending ? "Posting…" : "Post comment"}
        </Button>
      </div>
    </form>
  );
}
