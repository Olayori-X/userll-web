"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import type { ListingImage } from "@/lib/types/catalog";
import { cn } from "@/lib/utils";

type ListingGalleryProps = {
  images: ListingImage[];
  /** The listing's title, used to describe each photo to screen readers. */
  title: string;
  className?: string;
};

const ARROW =
  "absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm outline-none " +
  "transition hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/40";

/** The big photo with thumbnails underneath. Arrows and thumbnails both switch the photo. */
export function ListingGallery({ images, title, className }: ListingGalleryProps) {
  const photos = [...images].sort((a, b) => a.position - b.position);
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div
        className={cn("flex aspect-square items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground", className)}
      >
        <ImageOff className="size-12" aria-hidden />
        <span className="sr-only">No photos for this listing</span>
      </div>
    );
  }

  const count = photos.length;
  const position = Math.min(index, count - 1);
  const current = photos[position];

  // Past the last photo comes the first, and before the first comes the last.
  const step = (direction: 1 | -1) => setIndex((position + direction + count) % count);

  return (
    <div className={cn("grid gap-3", className)}>
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
        {/* contain, not cover: nothing in a seller's photo is cropped away on the page that sells it */}
        <Image
          key={current.id}
          src={current.url}
          alt={count > 1 ? `${title}, photo ${position + 1} of ${count}` : title}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-contain"
        />

        {count > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className={cn(ARROW, "left-2")}>
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next photo" className={cn(ARROW, "right-2")}>
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, photoIndex) => (
            <li key={photo.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(photoIndex)}
                aria-label={`Show photo ${photoIndex + 1} of ${count}`}
                aria-current={photoIndex === position ? "true" : undefined}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-lg border-2 bg-muted outline-none transition focus-visible:ring-3 focus-visible:ring-ring/40",
                  photoIndex === position ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <Image src={photo.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}