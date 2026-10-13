import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The pixel size of each artwork file, so the width always follows from the height. */
const ARTWORK = {
  full: { src: "/brand/userll-logo.png", width: 1044, height: 331 },
  mark: { src: "/brand/userll-mark.png", width: 262, height: 331 },
} as const;

type LogoProps = {
  /**
   * "full": symbol and name (website header, sign-in pages, seller and admin sidebars).
   * "mark": symbol only, for tight spaces.
   */
  variant?: keyof typeof ARTWORK;
  /** Height in pixels. The width follows from the shape of the artwork. */
  height?: number;
  /** Where it links to. Home by default; pass null for a plain, unlinked image. */
  href?: string | null;
  className?: string;
};

export function Logo({ variant = "full", height = 32, href = "/", className }: LogoProps) {
  const art = ARTWORK[variant];
  const width = Math.round((height * art.width) / art.height);

  // The image's own alt text ("Userll") becomes the link's name for screen readers.
  const image = <Image src={art.src} alt="Userll" width={width} height={height} className="shrink-0" />;

  if (href === null) return <span className={cn("inline-flex", className)}>{image}</span>;

  return (
    <Link
      href={href}
      className={cn("inline-flex rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40", className)}
    >
      {image}
    </Link>
  );
}