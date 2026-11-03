"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAddListingPhotos, useDeleteListingPhoto } from "@/hooks/use-seller-listings";
import { MAX_LISTING_PHOTOS, type SellerListing } from "@/lib/types/seller-listings";
import { PhotoPicker } from "@/components/seller/photo-picker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Every message the API sent, whichever picture it was about ("images", "images.0", ...), or the one general message. */
function messagesOf(error: unknown): string[] {
  if (error instanceof ApiError) {
    const all = Object.values(error.errors).flat();

    return all.length > 0 ? all : [error.message];
  }

  return ["Something went wrong. Please try again."];
}

/**
 * The photos of a listing that already exists. Adding uploads straight away. Removing asks first, because a removed
 * photo cannot be brought back. The first photo is the cover: there is no reordering, so to change it, remove the
 * cover (the next one takes its place) or add the picture you want again.
 */
export function ListingPhotos({ listing }: { listing: SellerListing }) {
  const add = useAddListingPhotos();
  const remove = useDeleteListingPhoto();
  const [confirming, setConfirming] = useState<number | null>(null);

  const photos = [...listing.images].sort((a, b) => a.position - b.position);
  const remaining = MAX_LISTING_PHOTOS - photos.length;

  // A live listing must keep at least one photo (the API enforces it too). Unpublish it first to remove the last one.
  const lastOfLive = listing.status === "active" && photos.length <= 1;

  const problems = add.isError ? messagesOf(add.error) : remove.isError ? messagesOf(remove.error) : [];
  const busy = add.isPending || remove.isPending;

  return (
    <section aria-labelledby="photos-heading" className="grid gap-4">
      <div className="grid gap-0.5">
        <h2 id="photos-heading" className="text-lg font-bold">
          Photos
        </h2>
        <p className="text-sm text-muted-foreground">
          {photos.length} of {MAX_LISTING_PHOTOS}. The first photo is the cover buyers see first.
        </p>
      </div>

      {problems.length > 0 && (
        <Alert variant="error">
          {problems.length === 1 ? (
            problems[0]
          ) : (
            <ul className="list-disc pl-4">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <li key={photo.id} className="grid gap-1.5">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                <Image src={photo.url} alt={`Photo ${index + 1} of ${photos.length}`} fill sizes="160px" className="object-cover" />

                {index === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                    Cover
                  </span>
                )}

                {confirming !== photo.id && (
                  <button
                    type="button"
                    disabled={busy || lastOfLive}
                    onClick={() => {
                      add.reset();
                      remove.reset();
                      setConfirming(photo.id);
                    }}
                    aria-label={`Remove photo ${index + 1}`}
                    title={lastOfLive ? "A live listing needs at least one photo. Unpublish it first to remove this one." : undefined}
                    className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm outline-none transition hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>

              {confirming === photo.id && (
                <div role="group" aria-label={`Remove photo ${index + 1}?`} className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant="destructive"
                    size="xs"
                    loading={remove.isPending}
                    onClick={() => remove.mutate({ id: listing.id, imageId: photo.id }, { onSuccess: () => setConfirming(null) })}
                  >
                    Remove
                  </Button>
                  <Button variant="outline" size="xs" disabled={remove.isPending} onClick={() => setConfirming(null)}>
                    Keep
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {lastOfLive && (
        <p className="text-xs text-muted-foreground">A live listing needs at least one photo. Unpublish it first if you want to remove this one.</p>
      )}

      <PhotoPicker
        remaining={remaining}
        disabled={busy}
        onAdd={(files) => {
          remove.reset();
          add.mutate({ id: listing.id, files });
        }}
      />
    </section>
  );
}