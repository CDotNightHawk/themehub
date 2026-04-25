// Server wrapper that resolves storage keys to URLs then hands the list to
// the client-side Lightbox. Callers should be server components.
import { getStorage } from "@/lib/storage";
import { Lightbox, type LightboxItem } from "./lightbox";

interface ScreenshotLike {
  id: string;
  storageKey: string;
  caption?: string;
}

export async function ScreenshotGallery({
  screenshots,
  alt,
}: {
  screenshots: ScreenshotLike[];
  alt: string;
}) {
  if (screenshots.length === 0) return null;
  const storage = getStorage();
  const items: LightboxItem[] = await Promise.all(
    screenshots.map(async (s) => ({
      id: s.id,
      url: await storage.url(s.storageKey),
      caption: s.caption,
    })),
  );
  return <Lightbox items={items} alt={alt} />;
}
