"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ExternalLink, ImageOff, PackageX } from "lucide-react";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { useAdminListing, useRemoveListing, useRestoreListing } from "@/hooks/use-admin";
import { formatDateTime } from "@/lib/dates";
import { applyApiErrors } from "@/lib/form-errors";
import { formatNaira } from "@/lib/money";
import type { AdminListing } from "@/lib/types/admin-listings";
import type { ListingStatus } from "@/lib/types/catalog";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";

const REASON_MAX = 255; // the API's limit

const removeSchema = z.object({
  reason: z.string().trim().min(5, "Say what the seller should fix, in at least 5 characters.").max(REASON_MAX, `Keep it under ${REASON_MAX} characters.`),
});

type RemoveValues = z.infer<typeof removeSchema>;

const STATUS_LOOK: Record<ListingStatus, { label: string; classes: string }> = {
  active: { label: "Active", classes: "bg-success-soft text-success" },
  draft: { label: "Draft", classes: "bg-muted text-muted-foreground" },
  sold_out: { label: "Sold out", classes: "bg-warning-soft text-warning" },
  removed: { label: "Removed", classes: "bg-danger-soft text-destructive" },
};

/** The API's `listing` error ("already removed", "not removed") is the most useful one when it comes. */
function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.fieldError("listing") ?? error.fieldError("reason") ?? error.message;

  return "Something went wrong. Please try again.";
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid gap-3 rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** Every photo, large enough to judge. A private-looking placeholder when the seller added none. */
function Photos({ listing }: { listing: AdminListing }) {
  const photos = [...listing.images].sort((a, b) => a.position - b.position);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
        <ImageOff className="size-10" aria-hidden />
        <span className="sr-only">This listing has no photos</span>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((photo, index) => (
        <li key={photo.id} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
          <Image
            src={photo.url}
            alt={`${listing.title}, photo ${index + 1} of ${photos.length}`}
            fill
            sizes="(min-width: 640px) 200px, 50vw"
            className="object-contain"
          />
        </li>
      ))}
    </ul>
  );
}

function RemoveForm({ listing, onCancel }: { listing: AdminListing; onCancel: () => void }) {
  const remove = useRemoveListing();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RemoveValues>({ resolver: zodResolver(removeSchema), defaultValues: { reason: "" } });

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = form;

  const length = watch("reason")?.length ?? 0;

  const submit = handleSubmit((values) => {
    setFormError(null);

    remove.mutate(
      { id: listing.id, reason: values.reason },
      {
        // A problem about the listing itself ("already removed") is not about the text, so it shows above the box.
        onError: (error) =>
          setFormError(error instanceof ApiError && error.fieldError("listing") ? errorText(error) : applyApiErrors(error, setError, ["reason"])),
      },
    );
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 rounded-lg border border-border bg-muted/50 p-4">
      <p className="font-semibold">Take down &ldquo;{listing.title}&rdquo;?</p>

      <ul className="list-disc pl-5 text-sm text-muted-foreground">
        <li>It comes off the market straight away.</li>
        <li>The seller is told, by message and email, and sees the reason you write below.</li>
        <li>They can&apos;t put it back on sale themselves.</li>
        <li>Orders already placed for it are not affected.</li>
      </ul>

      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField
        label="Reason"
        error={errors.reason?.message}
        hint="The seller reads this exactly as written, so say what they should fix. For example: “Photos show a different phone from the one described. Use pictures of the item you're selling.”"
      >
        {(control) => (
          <>
            <Textarea rows={3} maxLength={REASON_MAX} {...register("reason")} {...control} />
            <p className="text-right text-xs text-muted-foreground" aria-hidden>
              {length} / {REASON_MAX}
            </p>
          </>
        )}
      </FormField>

      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" variant="destructive" loading={remove.isPending}>
          Take it down and tell the seller
        </Button>
        <Button type="button" variant="outline" disabled={remove.isPending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Moderation({ listing }: { listing: AdminListing }) {
  const restore = useRestoreListing();
  const [mode, setMode] = useState<"remove" | "restore" | null>(null);

  if (listing.status === "removed") {
    return (
      <Card title="Removed">
        <div className="grid gap-1 text-sm">
          <p className="text-muted-foreground">Taken down {formatDateTime(listing.removed_at) ?? "earlier"}.</p>
          {listing.removal_reason && (
            <p>
              <span className="font-semibold">What the seller was told:</span> <span className="break-words">{listing.removal_reason}</span>
            </p>
          )}
        </div>

        {mode === "restore" ? (
          <ConfirmPanel
            title="Bring this listing back?"
            confirmLabel="Yes, restore it"
            keepLabel="Not yet"
            loading={restore.isPending}
            error={restore.isError ? errorText(restore.error) : null}
            onConfirm={() => restore.mutate({ id: listing.id })}
            onKeep={() => {
              restore.reset();
              setMode(null);
            }}
          >
            It comes back as a draft, not on sale. The seller is told, and has to publish it again themselves.
          </ConfirmPanel>
        ) : (
          <Button variant="outline" className="justify-self-start" onClick={() => setMode("restore")}>
            Restore as a draft
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card title="Moderation">
      <p className="text-sm text-muted-foreground">Take it down if it breaks the rules: wrong photos, prohibited items, misleading claims.</p>

      {mode === "remove" ? (
        <RemoveForm listing={listing} onCancel={() => setMode(null)} />
      ) : (
        <Button variant="outline" className="justify-self-start text-destructive hover:bg-danger-soft hover:text-destructive" onClick={() => setMode("remove")}>
          Take it down
        </Button>
      )}
    </Card>
  );
}

export function ListingReview({ id }: { id: number }) {
  const query = useAdminListing(id);

  if (query.isPending) return <PageSkeleton label="Loading the listing" />;

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <PageNotice icon={<PackageX className="size-7" aria-hidden />} title="We couldn't find that listing">
          <p className="text-sm text-muted-foreground">It may have been deleted by the seller.</p>
          <Link href="/admin/listings" className={buttonVariants({ size: "lg" })}>
            All listings
          </Link>
        </PageNotice>
      );
    }

    return (
      <Alert variant="error" title="We couldn't load this listing">
        <Button variant="link" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  const listing = query.data;
  const look = STATUS_LOOK[listing.status];
  const place = [listing.location.city, listing.location.state].filter(Boolean).join(", ");
  const hidden = listing.status === "active" && listing.seller?.account_status === "suspended";

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Link href="/admin/listings" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" aria-hidden />
          Listings
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            <h1 className="text-2xl font-bold tracking-tight break-words">{listing.title}</h1>
            <p className="text-sm text-muted-foreground">
              {formatNaira(listing.price)}
              {listing.delivery_fee > 0 ? ` + ${formatNaira(listing.delivery_fee)} delivery` : " · free delivery"}
              {` · ${listing.stock} in stock`}
            </p>
          </div>

          <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold", look.classes)}>{look.label}</span>
        </div>

        {hidden && <Alert variant="warning">This listing says &ldquo;active&rdquo;, but the seller is suspended, so buyers can&apos;t see it.</Alert>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="grid gap-6">
          <Photos listing={listing} />

          <Card title="Description">
            {/* The seller's own words as plain text with their line breaks. Nothing in it can run as code. */}
            <p className="text-sm leading-relaxed break-words whitespace-pre-line">{listing.description}</p>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card title="Details">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Category</dt>
              <dd className="text-right font-medium">{listing.category ?? "None"}</dd>

              <dt className="text-muted-foreground">Condition</dt>
              <dd className="text-right font-medium">{listing.condition === "new" ? "Brand new" : "Used"}</dd>

              {place && (
                <>
                  <dt className="text-muted-foreground">Ships from</dt>
                  <dd className="text-right font-medium">{place}</dd>
                </>
              )}

              <dt className="text-muted-foreground">Listed</dt>
              <dd className="text-right font-medium">{formatDateTime(listing.created_at)}</dd>
            </dl>

            {listing.status === "active" && !hidden && (
              <Link href={`/listings/${listing.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                <ExternalLink className="size-3.5" aria-hidden />
                See it as a buyer does
              </Link>
            )}
          </Card>

          {listing.seller && (
            <Card title="The seller">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Shop</dt>
                <dd className="text-right font-medium">{listing.seller.store_name ?? "No shop"}</dd>

                <dt className="text-muted-foreground">Account name</dt>
                <dd className="text-right font-medium">{listing.seller.name ?? "Unknown"}</dd>

                <dt className="text-muted-foreground">Account</dt>
                <dd className={cn("text-right font-medium", listing.seller.account_status === "suspended" && "text-destructive")}>
                  {listing.seller.account_status === "suspended" ? "Suspended" : "Active"}
                </dd>
              </dl>

              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <Link href={`/admin/users/${listing.seller.id}`} className="text-sm font-semibold text-primary hover:underline">
                  Their account
                </Link>
                <Link href={`/admin/listings?seller=${listing.seller.id}`} className="text-sm font-semibold text-primary hover:underline">
                  All their listings
                </Link>
              </div>
            </Card>
          )}

          <Moderation listing={listing} />
        </div>
      </div>
    </div>
  );
}