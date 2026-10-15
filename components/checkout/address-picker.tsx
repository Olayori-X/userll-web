"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAddresses, useCreateAddress } from "@/hooks/use-addresses";
import type { Address } from "@/lib/types/checkout";
import { AddressForm } from "@/components/checkout/address-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const MAX_ADDRESSES = 10; // the API's limit
const NONE: Address[] = []; // one shared empty list, so an effect below does not see a "new" list on every render

type AddressPickerProps = {
  /** The id of the chosen address, or null before anything is chosen. */
  selectedId: number | null;
  onSelect: (id: number) => void;
};

function AddressCard({ address, selected, onSelect }: { address: Address; selected: boolean; onSelect: () => void }) {
  return (
    <label className="relative flex cursor-pointer gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 has-checked:border-primary has-checked:bg-accent/40 has-focus-visible:ring-3 has-focus-visible:ring-ring/40">
      <input type="radio" name="address" checked={selected} onChange={onSelect} className="mt-1 size-4 shrink-0 accent-primary" />

      <span className="grid min-w-0 gap-0.5 text-sm">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{address.recipient_name}</span>

          {address.label && (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {address.label}
            </span>
          )}
          {address.is_default && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">Default</span>
          )}
        </span>

        <span className="text-muted-foreground">{address.phone}</span>
        <span className="break-words">{address.street}</span>
        <span className="text-muted-foreground">
          {address.city}, {address.state}
        </span>
      </span>
    </label>
  );
}

/**
 * Where should it be delivered? Saved addresses as cards (default first), and a form to add another.
 * Someone with no address yet goes straight to the form. The parent keeps the choice, so it can use it to pay.
 */
export function AddressPicker({ selectedId, onSelect }: AddressPickerProps) {
  const query = useAddresses();
  const create = useCreateAddress();
  const [adding, setAdding] = useState(false);

  const addresses = query.data ?? NONE;

  // Choose the default (or the first) address for them, and choose another if the chosen one was deleted.
  useEffect(() => {
    if (addresses.length === 0) return;
    if (selectedId !== null && addresses.some((address) => address.id === selectedId)) return;

    onSelect((addresses.find((address) => address.is_default) ?? addresses[0]).id);
  }, [addresses, selectedId, onSelect]);

  if (query.isPending) {
    return (
      <div className="grid gap-3" role="status">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <span className="sr-only">Loading your addresses</span>
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert variant="error" title="We couldn't load your addresses">
        <Button variant="link" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  const saveNew = async (values: Parameters<typeof create.mutateAsync>[0]) => {
    const saved = await create.mutateAsync(values); // if this throws, the form shows the API's error
    onSelect(saved.id);
    setAdding(false);
  };

  // No address at all: the form is the only thing to do, and the first address becomes the default by itself.
  if (addresses.length === 0) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-muted-foreground">Add the address where your order should be delivered.</p>
        <AddressForm hideDefaultOption submitLabel="Save and continue" onSubmit={saveNew} />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-3">
        <legend className="sr-only">Choose a delivery address</legend>

        {addresses.map((address) => (
          <AddressCard
            key={address.id}
            address={address}
            selected={address.id === selectedId}
            onSelect={() => onSelect(address.id)}
          />
        ))}
      </fieldset>

      {adding ? (
        <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold">New address</h3>
          <AddressForm submitLabel="Save address" onSubmit={saveNew} onCancel={() => setAdding(false)} />
        </div>
      ) : addresses.length < MAX_ADDRESSES ? (
        <Button variant="outline" className="justify-self-start" onClick={() => setAdding(true)}>
          <Plus aria-hidden />
          Add a new address
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">You&apos;ve saved the most addresses allowed ({MAX_ADDRESSES}).</p>
      )}
    </div>
  );
}