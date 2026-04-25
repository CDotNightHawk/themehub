import { siteName } from "@/lib/utils";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 prose-themehub">
      <h1>About {siteName()}</h1>
      <p>
        themehub started because finding a coherent, niche-friendly theme — for
        any layer of your stack — is unreasonably hard. Every project has its
        own format, registry, and naming convention, and most niche communities
        end up trading themes in screenshot threads.
      </p>
      <p>
        This is a community-built hub for everything you can re-skin: GRUB,
        Ventoy, your desktop environment, your bootloader, your terminal, your
        VS Code, and the stickers you stick on your laptop.
      </p>
      <p>
        It is open source, MIT-licensed, and designed to be self-hosted. Run a
        public instance, run a tiny private one for your friend group, or just
        use the CLI to install themes from someone else&apos;s hub.
      </p>
    </div>
  );
}
