"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { LockKeyhole, MailWarning, ShoppingCart, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useCart, useClearCart, useRemoveCartItem, useSetCartQuantity } from "@/hooks/use-cart";
import { formatNaira } from "@/lib/money";
import type { CartItem } from "@/lib/types/cart";
import { CartLine } from "@/components/cart/cart-line";
import { useSession } from "@/components/providers/session-provider";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

type Group = { key: string; storeName: string; storeSlug: string | null; items: CartItem[] };

/** One group per seller, in the order their first item was added. Each seller's items become one order. */
function groupBySeller(items: CartItem[]): Group[] {
  const groups = new Map<string, Group>();

  for (const item of items) {
    const key = item.store_slug ?? "unavailable";
    const group = groups.get(key) ?? {
      key,
      storeName: item.store_name ?? "Unavailable items",
      storeSlug: item.store_slug,
      items: [],
    };

    group.items.push(item);
    groups.set(key, group);
  }

  return [...groups.values()];
}

/** One delivery fee per seller: the highest among that seller's items (the same rule the API charges by). */
const deliveryFor = (group: Group) => Math.max(0, ...group.items.map((item) => item.delivery_fee));

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.fieldError("quantity") ?? error.fieldError("item") ?? error.message;

  return "Something went wrong. Please try again.";
}

function Skeleton() {
  return (
    <div className="grid gap-4" role="status">
      <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <span className="sr-only">Loading your cart</span>
    </div>
  );
}

function Notice({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-3 rounded-xl border border-border bg-card px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">{icon}</div>
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}

/** The whole cart page. It knows what to show for each situation: logged out, unverified, loading, failed, empty, full. */
export function CartView() {
  const { user, status } = useSession();
  const cart = useCart();
  const setQuantity = useSetCartQuantity();
  const remove = useRemoveCartItem();
  const clear = useClearCart();

  const groups = useMemo(() => groupBySeller(cart.data?.items ?? []), [cart.data?.items]);

  if (status === "loading") return <Skeleton />;

  if (status === "error") {
    return <Alert variant="error">We couldn&apos;t load your account. Check your connection and refresh the page.</Alert>;
  }

  if (!user) {
    return (
      <Notice icon={<LockKeyhole className="size-7" aria-hidden />} title="Log in to see your cart">
        <p className="text-sm text-muted-foreground">Your cart is saved to your account.</p>
        <Link href="/login?next=%2Fcart" className={buttonVariants({ size: "lg" })}>
          Log in
        </Link>
      </Notice>
    );
  }

  if (!user.email_verified) {
    return (
      <Notice icon={<MailWarning className="size-7" aria-hidden />} title="Verify your email first">
        <p className="text-sm text-muted-foreground">Confirm your email address to add things to your cart and buy.</p>
        <Link href="/verify-email?next=%2Fcart" className={buttonVariants({ size: "lg" })}>
          Verify now
        </Link>
      </Notice>
    );
  }

  if (cart.isPending) return <Skeleton />;

  if (cart.isError) {
    return (
      <Alert variant="error" title="We couldn't load your cart">
        <Button variant="link" onClick={() => void cart.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  const data = cart.data;

  if (data.items.length === 0) {
    return (
      <Notice icon={<ShoppingCart className="size-7" aria-hidden />} title="Your cart is empty">
        <p className="text-sm text-muted-foreground">Find something you like and add it here.</p>
        <Link href="/listings" className={buttonVariants({ size: "lg" })}>
          Browse products
        </Link>
      </Notice>
    );
  }

  const lineBusy = (itemId: number) =>
    (setQuantity.isPending && setQuantity.variables?.itemId === itemId) || (remove.isPending && remove.variables === itemId);

  const lineError = (itemId: number) =>
    setQuantity.isError && setQuantity.variables?.itemId === itemId ? messageOf(setQuantity.error) : null;

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">
          Your cart <span className="text-base font-medium text-muted-foreground">({data.item_count})</span>
        </h1>

        <Button
          variant="ghost"
          size="sm"
          loading={clear.isPending}
          onClick={() => {
            if (window.confirm("Remove everything from your cart?")) clear.mutate();
          }}
        >
          <Trash2 aria-hidden />
          Clear cart
        </Button>
      </div>

      {clear.isError && <Alert variant="error">{messageOf(clear.error)}</Alert>}
      {remove.isError && <Alert variant="error">{messageOf(remove.error)}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="grid gap-4">
          <Alert variant="info">Grouped by seller. Each seller&apos;s items become a separate order.</Alert>

          {groups.map((group) => {
            const delivery = deliveryFor(group);

            return (
              <section key={group.key} aria-label={group.storeName} className="rounded-xl border border-border bg-card px-4">
                <div className="flex items-center justify-between gap-3 border-b border-border py-3">
                  {group.storeSlug ? (
                    <Link href={`/sellers/${group.storeSlug}`} className="truncate font-semibold hover:text-primary">
                      {group.storeName}
                    </Link>
                  ) : (
                    <p className="truncate font-semibold text-muted-foreground">{group.storeName}</p>
                  )}
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {group.items.length} {group.items.length === 1 ? "item" : "items"}
                  </p>
                </div>

                <ul className="divide-y divide-border">
                  {group.items.map((item) => (
                    <CartLine
                      key={item.id}
                      item={item}
                      busy={lineBusy(item.id)}
                      error={lineError(item.id)}
                      onQuantityChange={(quantity) => {
                        remove.reset();
                        setQuantity.mutate({ itemId: item.id, quantity });
                      }}
                      onRemove={() => {
                        setQuantity.reset();
                        remove.mutate(item.id);
                      }}
                    />
                  ))}
                </ul>

                <p className="border-t border-border py-3 text-right text-xs text-muted-foreground">
                  {delivery === 0 ? "Free delivery from this seller" : `Delivery from this seller: ${formatNaira(delivery)}`}
                </p>
              </section>
            );
          })}
        </div>

        <aside aria-label="Order summary" className="grid gap-4 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-28">
          <h2 className="text-lg font-bold">Order summary</h2>

          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-right font-medium">{formatNaira(data.subtotal)}</dd>

            <dt className="text-muted-foreground">Delivery</dt>
            <dd className="text-right font-medium">{data.delivery_total === 0 ? "Free" : formatNaira(data.delivery_total)}</dd>

            <dt className="border-t border-border pt-3 font-bold">Total</dt>
            <dd className="border-t border-border pt-3 text-right text-lg font-extrabold">{formatNaira(data.total)}</dd>
          </dl>

          {data.can_checkout ? (
            <Link href="/checkout" className={buttonVariants({ size: "lg" })}>
              Proceed to checkout
            </Link>
          ) : (
            <>
              <Button size="lg" disabled>
                Proceed to checkout
              </Button>
              <p role="alert" className="text-center text-xs font-medium text-destructive">
                Fix the items marked in red to continue.
              </p>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground">Pay safely: we hold your money until your order arrives.</p>
        </aside>
      </div>
    </div>
  );
}