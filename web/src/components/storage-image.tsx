// Resolves a storage key (S3 or local) to a URL suitable for <img>. Used
// across cards and detail pages so callers don't need to know the driver.
import { getStorage } from "@/lib/storage";

export async function StorageImage({
  storageKey,
  alt,
  className,
}: {
  storageKey: string;
  alt: string;
  className?: string;
}) {
  const url = await getStorage().url(storageKey);
  // Using a plain <img> because URLs may be presigned/short-lived (S3) and
  // we don't want next/image to cache absolute external URLs.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
