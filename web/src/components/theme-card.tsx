import Link from "next/link";
import type { ThemeCard as TC } from "@/server/themes";
import { Badge, Card, Stars } from "./ui";
import { formatNumber } from "@/lib/utils";
import { getCategory } from "@/lib/categories";
import { StorageImage } from "./storage-image";

export function ThemeCard({ card }: { card: TC }) {
  const cat = getCategory(card.theme.type);
  return (
    <Card className="group flex flex-col overflow-hidden transition hover:border-[color:var(--accent)]/60">
      <Link
        href={`/themes/${card.theme.slug}`}
        className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-[color:var(--accent)]/30 to-[color:var(--accent)]/5"
      >
        {card.screenshotKey ? (
          <StorageImage
            storageKey={card.screenshotKey}
            alt={card.theme.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-4xl">
            {emojiFor(card.theme.type)}
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/themes/${card.theme.slug}`}
            className="line-clamp-1 font-semibold hover:text-[color:var(--accent)]"
          >
            {card.theme.name}
          </Link>
          {card.theme.nsfw && (
            <Badge className="border-amber-500/40 text-amber-700 dark:text-amber-300">
              NSFW
            </Badge>
          )}
        </div>
        <p className="line-clamp-2 text-xs text-[color:var(--muted)]">
          {card.theme.description}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
          <Badge>{cat?.label ?? card.theme.type}</Badge>
          <Stars value={card.rating} count={card.ratingCount} />
          <span>· {formatNumber(card.theme.downloads)} dl</span>
          {card.authorUsername && (
            <Link
              href={`/u/${card.authorUsername}`}
              className="ml-auto hover:underline"
            >
              @{card.authorUsername}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

function emojiFor(type: string): string {
  switch (type) {
    case "grub":
    case "refind":
    case "systemd-boot":
      return "🥾";
    case "ventoy":
      return "💾";
    case "plymouth":
      return "🌊";
    case "sddm":
    case "gdm":
      return "🔐";
    case "gtk":
    case "kde-plasma":
      return "🎨";
    case "icon":
      return "🖼️";
    case "cursor":
      return "🖱️";
    case "wallpaper":
      return "🌄";
    case "terminal":
      return "💻";
    case "vscode":
      return "📝";
    case "firefox":
      return "🦊";
    case "sticker":
      return "🏷️";
    case "hardware":
      return "🔧";
    default:
      return "🐾";
  }
}
