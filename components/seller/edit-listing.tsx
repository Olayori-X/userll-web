"use client";

import { useState } from "react";
import Link from "next/link";
import { PackageX } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useSellerListing, useUpdateListing } from "@/hooks/use-seller-listings";
import type { Category } from "@/lib/types/catalog";
import type { ListingInput } from "@/lib/types/seller-listings";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { ListingForm } from "@/components/seller/listing-form";
import { ListingPhotos } from "@/components/seller/listing-photos";
import { PublishPanel } from "@/components/seller/publish-panel";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

type EditListingProps = {
  id: number;
  categories: Category[];
  /** True right after creating the listing. */
  justCreated: boolean;
};

export function EditListing({ id, categories, justCreated }: EditListingProps) {
  const query = useSellerListing(id);
  const update = useUpdateListing();
  const [saved, setSaved] = useState(false);

  if (query.isPending) return <PageSkeleton label="Loading your product" />;

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <PageNotice icon={<PackageX className="size-7" aria-hidden />} title="We couldn't find that product">
          <p className="text-sm text-muted-foreground">It may have been deleted, or it belongs to a different shop.</p>
          <Link href="/seller/listings" className={buttonVariants({ size: "lg" })}>
            All products
          </Link>
        </PageNotice>
      );
    }

    return (
      <Alert variant="error" title="We couldn't load this product">
        <Button variant="link" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  const listing = query.data;
  const removed = listing.status === "removed";

  async function save(values: ListingInput) {
    setSaved(false);

    await update.mutateAsync({ id, changes: values }); // if this throws, the form shows the API's error

    setSaved(true);
  }

  return (
    <div className="grid gap-8">
      <PublishPanel listing={listing} justCreated={justCreated} />

      {removed ? (
        <Alert variant="info">This product was removed by an admin, so it can&apos;t be changed.</Alert>
      ) : (
        <>
          <ListingPhotos listing={listing} />

          <section aria-labelledby="details-heading" className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 id="details-heading" className="text-lg font-bold">
              Details
            </h2>

            {saved && <Alert variant="success">Saved.</Alert>}

            {/* Keyed by when the listing last came from the API, so what is shown is always what was really saved. */}
            <ListingForm categories={categories} listing={listing} submitLabel="Save changes" onSubmit={save} />
          </section>
        </>
      )}
    </div>
  );
}