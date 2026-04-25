"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@/components/ui";

export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const router = useRouter();

  function submit() {
    if (!file) {
      setError("pick a zip archive first");
      return;
    }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("archive", file);
      fd.append("notes", notes);
      const res = await fetch("/api/themes", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(j?.error?.message ?? `upload failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as { slug: string };
      router.push(`/themes/${data.slug}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) setFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition ${
          dragOver
            ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10"
            : "border-[color:var(--card-border)]"
        }`}
      >
        <span className="text-3xl">📦</span>
        {file ? (
          <>
            <span className="font-medium">{file.name}</span>
            <span className="text-xs text-[color:var(--muted)]">
              {(file.size / 1024 / 1024).toFixed(2)} MB · click to replace
            </span>
          </>
        ) : (
          <>
            <span className="font-medium">
              Drop your <code>.zip</code> here or click to choose
            </span>
            <span className="text-xs text-[color:var(--muted)]">
              Archive must contain <code>theme.toml</code> at the root. Max 50
              MB.
            </span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
          }}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Release notes (optional)
        </label>
        <Textarea
          placeholder="What's new in this version?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending || !file}>
          {pending ? "Uploading…" : "Publish theme"}
        </Button>
      </div>
    </div>
  );
}
