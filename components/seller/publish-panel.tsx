"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, ExternalLink } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useDeleteListing, usePublishListing, useUnpublishListing } from "@/hooks/use-seller-listings";
import type { ListingStatus } from "@/lib/types/catalog";
import type { SellerListing } from "@/lib/types/seller-listings";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";

const STATUS: Record<ListingStatus, { label: string; classes: string; text: string }> = {
  active: { label: "Active", classes: "bg-success-soft text-success", text: "Buyers can find and buy this." },
  draft: { label: "Draft", classes: "bg-muted text-muted-foreground", text: "Only you can see this. Publish it when it's ready." },
  sold_out: {
    label: "Sold out",
    classes: "bg-warning-soft text-warning",
    text: "You have none left. Add more stock below and it goes back on sale by itself.",
  },
  removed: { label: "Removed", classes: "bg-danger-soft text-destructive", text: "An admin took this down. It can't be put back on sale." },
};

/** Any problem the API names: the field it is about, a status message, or the general one. */
function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    return error.fieldError("images") ?? error.fieldError("stock") ?? error.fieldError("status") ?? error.message;
  }

  return "Something went wrong. Please try again.";
}

type PublishPanelProps = {
  listing: SellerListing;
  /** True right after creating it: the panel then says so. */
  justCreated?: boolean;
};

/**
 * The listing's status and the buttons that change it: publish, take it down, delete.
 * It states what is still missing before a draft can go on sale, so the Publish button is never a surprise.
 */
export function PublishPanel({ listing, justCreated = false }: PublishPanelProps) {
  const router = useRouter();
  const publish = usePublishListing();
  const unpublish = useUnpublishListing();
  const remove = useDeleteListing();
  const [deleting, setDeleting] = useState(false);

  const look = STATUS[listing.status];

  // The same two rules the API enforces before it lets a listing go on sale.
  const missing = [
    ...(listing.images.length === 0 ? ["Add at least one photo."] : []),
    ...(listing.stock < 1 ? ["Set how many you have, at least 1."] : []),
  ];

  const canPublish = listing.status === "draft";
  const canUnpublish = listing.status === "active";

  const actionError = publish.isError ? errorText(publish.error) : unpublish.isError ? errorText(unpublish.error) : null;
  const busy = publish.isPending || unpublish.isPending || remove.isPending;

  return (
    <section aria-label="Status" className="grid gap-4 rounded-xl border border-border bg-card p-5">
      {justCreated && listing.status === "draft" && (
        <Alert variant="success" title="Saved as a draft">
          Have a look over it, then publish it when you&apos;re ready.
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold", look.classes)}>{look.label}</span>
        <p className="text-sm text-muted-foreground">{look.text}</p>
      </div>

      {listing.status === "removed" && listing.removal_reason && (
        <Alert variant="error" title="Why it was removed">
          {listing.removal_reason}
        </Alert>
      )}

      {canPublish && missing.length > 0 && (
        <div className="grid gap-1.5 rounded-lg border border-warning/30 bg-warning-soft p-3">
          <p className="text-sm font-semibold text-warning">Before you can publish:</p>
          <ul className="grid gap-1 text-sm">
            {missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {actionError && <Alert variant="error">{actionError}</Alert>}

      <div className="flex flex-wrap gap-2.5">
        {canPublish && (
          <Button loading={publish.isPending} disabled={missing.length > 0 || busy} onClick={() => publish.mutate({ id: listing.id })}>
            <CircleCheck aria-hidden />
            Publish
          </Button>
        )}

        {canUnpublish && (
          <Button variant="outline" loading={unpublish.isPending} disabled={busy} onClick={() => unpublish.mutate({ id: listing.id })}>
            Take it down
          </Button>
        )}

        {listing.status === "active" && (
          <Link href={`/listings/${listing.slug}`} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline" })}>
            <ExternalLink aria-hidden />
            View on Userll
          </Link>
        )}
      </div>

      {listing.status === "active" && (
        <p className="text-xs text-muted-foreground">
          Changes to a live product can take up to a minute to show to buyers. Checkout always uses your latest price and stock.
        </p>
      )}

      <div className="grid gap-3 border-t border-border pt-4">
        {deleting ? (
          <ConfirmPanel
            title="Delete this product?"
            confirmLabel="Yes, delete it"
            keepLabel="Keep it"
            destructive
            loading={remove.isPending}
            error={remove.isError ? errorText(remove.error) : null}
            onConfirm={() => remove.mutate(listing.id, { onSuccess: () => router.replace("/seller/listings") })}
            onKeep={() => {
              remove.reset();
              setDeleting(false);
            }}
          >
            It disappears from your shop and you can&apos;t bring it back. Orders already placed for it keep their history.
          </ConfirmPanel>
        ) : (
          <Button variant="ghost" className="justify-self-start text-destructive hover:bg-danger-soft hover:text-destructive" disabled={busy} onClick={() => setDeleting(true)}>
            Delete product
          </Button>
        )}
      </div>
    </section>
  );
}