"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateListing } from "@/hooks/use-seller-listings";
import type { Category } from "@/lib/types/catalog";
import { MAX_LISTING_PHOTOS, type ListingInput } from "@/lib/types/seller-listings";
import { ListingForm } from "@/components/seller/listing-form";
import { PhotoPicker, SelectedPhotos } from "@/components/seller/photo-picker";

/** The same picture chosen twice counts once. */
const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

type CreateListingProps = {
  /** The active categories, read on the server by the page. */
  categories: Category[];
};

/**
 * A new product: the details and its first photos, sent together as a draft. The seller publishes it on the next
 * screen, once they have looked it over.
 */
export function CreateListing({ categories }: CreateListingProps) {
  const router = useRouter();
  const create = useCreateListing();
  const [photos, setPhotos] = useState<File[]>([]);

  async function save(values: ListingInput) {
    const listing = await create.mutateAsync({ ...values, images: photos }); // if this throws, the form shows the API's error

    router.replace(`/seller/listings/${listing.id}?new=1`);

    // Stay "busy" until the page changes, so a second click can never make a second draft.
    await new Promise<never>(() => {});
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <ListingForm categories={categories} submitLabel="Save as draft" onSubmit={save}>
        <section aria-labelledby="photos-heading" className="grid gap-3">
          <div className="grid gap-0.5">
            <h2 id="photos-heading" className="text-sm font-semibold">
              Photos
            </h2>
            <p className="text-xs text-muted-foreground">
              Add at least one to publish. The first photo is the cover buyers see first. You can add more later.
            </p>
          </div>

          <PhotoPicker
            remaining={MAX_LISTING_PHOTOS - photos.length}
            onAdd={(files) =>
              setPhotos((current) =>
                [...current, ...files.filter((file) => !current.some((existing) => sameFile(existing, file)))].slice(0, MAX_LISTING_PHOTOS),
              )
            }
            disabled={create.isPending}
          />

          <SelectedPhotos
            files={photos}
            onRemove={(index) => setPhotos((current) => current.filter((_, position) => position !== index))}
            onMakeCover={(index) =>
              setPhotos((current) => [current[index], ...current.filter((_, position) => position !== index)])
            }
          />
        </section>

        <p className="text-xs text-muted-foreground">
          It&apos;s saved as a draft first. Only you can see it until you publish it.
        </p>
      </ListingForm>
    </div>
  );
}