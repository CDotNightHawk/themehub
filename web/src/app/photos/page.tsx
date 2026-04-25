import Link from "next/link";
import { listPhotos, type PhotoCard } from "@/server/themes";
import { StorageImage } from "@/components/storage-image";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { EmptyState } from "@/components/ui";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata = {
  title: "Photos — rice gallery",
  description:
    "Every screenshot across the hub — browse for inspiration or find the theme behind a setup.",
};

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; tag?: string }>;
}) {
  const { type, tag } = await searchParams;
  const session = await auth();
  let includeNsfw = false;
  if (session?.user?.id) {
    const [u] = await db
      .select({ showNsfw: users.showNsfw })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    includeNsfw = u?.showNsfw ?? false;
  }

  const photos = await listPhotos({
    type,
    tag,
    limit: 120,
    includeNsfw,
  });

  const activeCat = type ? getCategory(type) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <p className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
        Photos
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        {activeCat ? `${activeCat.label} gallery` : "Rice gallery"}
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-[color:var(--muted)]">
        Every screenshot published with a theme, newest first. Click any photo
        to jump to its theme.
        {tag && (
          <>
            {" "}Filtered by tag <code className="font-mono">#{tag}</code>.
          </>
        )}
      </p>

      <div className="mt-4 flex flex-wrap gap-1 text-xs">
        <FilterChip href="/photos" active={!type}>
          All
        </FilterChip>
        {CATEGORIES.map((c) => (
          <FilterChip
            key={c.type}
            href={`/photos?type=${c.type}${tag ? `&tag=${tag}` : ""}`}
            active={type === c.type}
          >
            {c.icon} {c.label}
          </FilterChip>
        ))}
      </div>

      {photos.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No photos yet"
            description={
              type
                ? "No screenshots for this category yet. Upload a theme with screenshots and yours will show up here."
                : "Once themes with screenshots are published, their photos will stream in here."
            }
            action={
              <Link
                href="/themes/new"
                className="text-[color:var(--accent)] underline"
              >
                Upload a theme
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <PhotoTile key={p.id} photo={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoTile({ photo }: { photo: PhotoCard }) {
  const cat = getCategory(photo.themeType);
  return (
    <Link
      href={`/themes/${photo.themeSlug}`}
      className="group relative block overflow-hidden rounded-xl border border-[color:var(--card-border)] bg-[color:var(--card)] transition hover:border-[color:var(--accent)]/70"
    >
      <StorageImage
        storageKey={photo.storageKey}
        alt={photo.themeName}
        className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 text-xs text-white">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium">{photo.themeName}</span>
          <span className="shrink-0 opacity-80">
            {cat?.icon} {cat?.label ?? photo.themeType}
          </span>
        </div>
      </div>
    </Link>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 transition ${
        active
          ? "border-[color:var(--accent)] bg-[color:var(--accent)]/15 text-[color:var(--foreground)]"
          : "border-[color:var(--card-border)] text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
      }`}
    >
      {children}
    </Link>
  );
}
