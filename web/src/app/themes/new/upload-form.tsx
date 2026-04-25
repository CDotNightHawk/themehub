"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@/components/ui";

export function UploadForm() {
  const archiveInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const router = useRouter();

  function addPhotos(files: FileList | File[] | null) {
    if (!files) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setPhotos((prev) => [...prev, ...list].slice(0, 10));
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function submit() {
    if (!file) {
      setError("pick a zip archive first");
      return;
    }
    setError(null);
    startTransition(async () => {
      setStatus("Uploading archive…");
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
        setStatus(null);
        return;
      }
      const data = (await res.json()) as { slug: string };

      if (photos.length > 0) {
        setStatus(`Attaching ${photos.length} screenshot(s)…`);
        const photoFd = new FormData();
        for (const p of photos) photoFd.append("images", p);
        const photoRes = await fetch(
          `/api/themes/${data.slug}/screenshots`,
          {
            method: "POST",
            body: photoFd,
          },
        );
        if (!photoRes.ok) {
          const j = (await photoRes.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          // Non-fatal — theme still published successfully.
          setError(
            `theme published, but screenshot upload failed: ${
              j?.error?.message ?? photoRes.status
            }`,
          );
        }
      }

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
        onClick={() => archiveInputRef.current?.click()}
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
          ref={archiveInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
          }}
        />
      </div>

      <div className="rounded-xl border border-[color:var(--card-border)] p-4">
        <div className="flex items-baseline justify-between">
          <label className="text-sm font-medium">
            Screenshots (optional)
          </label>
          <button
            type="button"
            onClick={() => photosInputRef.current?.click()}
            className="text-xs text-[color:var(--accent)] hover:underline"
          >
            Add photos…
          </button>
        </div>
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          Up to 10 images, 10 MB each. PNG / JPG / WebP / GIF / SVG / AVIF.
          These sit alongside any screenshots declared in the manifest.
        </p>
        <input
          ref={photosInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            addPhotos(e.target.files);
            e.target.value = "";
          }}
        />
        {photos.length > 0 && (
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p, i) => {
              const url = URL.createObjectURL(p);
              return (
                <li
                  key={`${p.name}-${i}`}
                  className="group relative overflow-hidden rounded-lg border border-[color:var(--card-border)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={p.name}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
                  >
                    remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
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
      {status && !error && (
        <p className="text-sm text-[color:var(--muted)]">{status}</p>
      )}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending || !file}>
          {pending ? "Uploading…" : "Publish theme"}
        </Button>
      </div>
    </div>
  );
}
