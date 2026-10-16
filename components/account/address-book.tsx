"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAddresses, useCreateAddress, useDeleteAddress, useUpdateAddress } from "@/hooks/use-addresses";
import { AddressForm } from "@/components/checkout/address-form";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const MAX_ADDRESSES = 10; // the API's limit

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}

export function AddressBook() {
  const query = useAddresses();
  const create = useCreateAddress();
  // Two separate copies, so a failed "make default" is not mixed up with the edit form's own errors.
  const saveEdit = useUpdateAddress();
  const makeDefault = useUpdateAddress();
  const remove = useDeleteAddress();

  /** The id of the address being edited, "new" for the add form, or null. */
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  if (query.isPending) return <PageSkeleton label="Loading your addresses" />;

  if (query.isError) {
    return (
      <Alert variant="error" title="We couldn't load your addresses">
        <Button variant="link" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  const addresses = query.data;
  const actionError = makeDefault.isError ? messageOf(makeDefault.error) : remove.isError ? messageOf(remove.error) : null;

  const addForm = (
    <AddressForm
      hideDefaultOption={addresses.length === 0} // the first address is the default automatically
      submitLabel="Save address"
      onSubmit={(values) => create.mutateAsync(values).then(() => setEditing(null))}
      onCancel={addresses.length > 0 ? () => setEditing(null) : undefined}
    />
  );

  if (addresses.length === 0) {
    return (
      <div className="grid gap-5">
        <PageNotice icon={<MapPin className="size-7" aria-hidden />} title="No saved addresses yet">
          <p className="max-w-sm text-sm text-muted-foreground">
            Save the places you want things delivered to, and checkout is a single tap.
          </p>
        </PageNotice>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-semibold">Add an address</h2>
          {addForm}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {actionError && <Alert variant="error">{actionError}</Alert>}

      <ul className="grid gap-4">
        {addresses.map((address) =>
          editing === address.id ? (
            <li key={address.id} className="rounded-xl border border-primary/40 bg-card p-5">
              <h2 className="mb-4 font-semibold">Edit address</h2>
              <AddressForm
                address={address}
                submitLabel="Save changes"
                onSubmit={(values) => saveEdit.mutateAsync({ id: address.id, input: values }).then(() => setEditing(null))}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li key={address.id} className="grid gap-4 rounded-xl border border-border bg-card p-5">
              <div className="grid gap-0.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{address.recipient_name}</span>

                  {address.label && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {address.label}
                    </span>
                  )}
                  {address.is_default && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                      Default
                    </span>
                  )}
                </div>

                <span className="text-muted-foreground">{address.phone}</span>
                <span className="break-words">{address.street}</span>
                <span className="text-muted-foreground">
                  {address.city}, {address.state}
                </span>
              </div>

              {deleting === address.id ? (
                <div role="group" aria-label="Confirm delete" className="grid gap-2 rounded-lg border border-border bg-muted/50 p-3">
                  <p className="text-sm font-semibold">Delete this address?</p>
                  <p className="text-xs text-muted-foreground">
                    Orders you&apos;ve already placed keep the address they were sent to.
                    {address.is_default && addresses.length > 1 && " Your newest other address becomes the default."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      loading={remove.isPending}
                      onClick={() => remove.mutate(address.id, { onSuccess: () => setDeleting(null) })}
                    >
                      Delete
                    </Button>
                    <Button variant="outline" size="sm" disabled={remove.isPending} onClick={() => setDeleting(null)}>
                      Keep it
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeleting(null);
                      setEditing(address.id);
                    }}
                  >
                    <Pencil aria-hidden />
                    Edit
                  </Button>

                  {!address.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={makeDefault.isPending && makeDefault.variables?.id === address.id}
                      onClick={() => makeDefault.mutate({ id: address.id, input: { is_default: true } })}
                    >
                      <Star aria-hidden />
                      Make default
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      remove.reset();
                      setEditing(null);
                      setDeleting(address.id);
                    }}
                  >
                    <Trash2 aria-hidden />
                    Delete
                  </Button>
                </div>
              )}
            </li>
          ),
        )}
      </ul>

      {editing === "new" ? (
        <div className="rounded-xl border border-primary/40 bg-card p-5">
          <h2 className="mb-4 font-semibold">New address</h2>
          {addForm}
        </div>
      ) : addresses.length < MAX_ADDRESSES ? (
        <Button
          variant="outline"
          className="justify-self-start"
          onClick={() => {
            setDeleting(null);
            setEditing("new");
          }}
        >
          <Plus aria-hidden />
          Add a new address
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">You&apos;ve saved the most addresses allowed ({MAX_ADDRESSES}).</p>
      )}
    </div>
  );
}