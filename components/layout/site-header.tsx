"use client";

import { Suspense, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, MessageCircle, Search, ShoppingCart } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AccountMenu } from "@/components/layout/account-menu";
import { useSession } from "@/components/providers/session-provider";
import { IconLink } from "@/components/layout/icon-link";
import { useCartCount } from "@/hooks/use-cart";
import { useUnreadCount } from "@/hooks/use-chat";
import { useUnreadNotificationCount } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

/**
 * The search box. It goes to /listings?q=..., and shows what was searched while you are on that page.
 * Uncontrolled on purpose: the text is read when the form is sent, and `key` refreshes it when the address changes.
 */
function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const query = pathname === "/listings" ? (params.get("q") ?? "") : "";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = String(new FormData(event.currentTarget).get("q") ?? "").trim();

    router.push(text ? `/listings?q=${encodeURIComponent(text)}` : "/listings");
  }

  return (
    <form key={query} role="search" onSubmit={onSubmit} className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        name="q"
        defaultValue={query}
        maxLength={100} // the API's limit
        placeholder="Search for products"
        aria-label="Search for products"
        enterKeyHint="search"
        autoComplete="off"
        className="h-10 w-full rounded-full border border-input bg-card pr-4 pl-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 md:text-sm"
      />
    </form>
  );
}

const SEARCH_LAYOUT = "order-last w-full md:order-none md:max-w-md md:flex-1";

export function SiteHeader() {
  const { user, status } = useSession();
  const cartCount = useCartCount();
  const unreadMessages = useUnreadCount();
  const unreadNotifications = useUnreadNotificationCount();

  // Sellers do not need "Become a seller". Wait until we know who is looking, so the link does not flash.
  const showSellLink = status !== "loading" && !user?.is_seller;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      {/* Phones: logo and buttons on the first row, the search box full width underneath. */}
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 md:flex-nowrap lg:px-8">
        <Logo height={32} />

        <nav aria-label="Main" className="hidden items-center gap-5 text-sm font-semibold md:flex">
          <Link href="/listings" className="hover:text-primary">
            Shop
          </Link>
          {showSellLink && (
            <Link href="/sell" className="hover:text-primary">
              Become a seller
            </Link>
          )}
        </nav>

        {/* useSearchParams needs a Suspense boundary around it, so pages can still be built ahead of time. */}
        <Suspense fallback={<div className={cn("h-10", SEARCH_LAYOUT)} aria-hidden />}>
          <SearchBox className={SEARCH_LAYOUT} />
        </Suspense>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Only for people with an account: a visitor has no messages to see. */}
          {/* Only for people with an account: a visitor has nothing to be notified about. */}
          {user && (
            <>
              {/* Hidden on narrow phones to save room: Notifications is also in the account menu. */}
              <div className="hidden sm:contents">
                <IconLink
                  href="/notifications"
                  count={unreadNotifications}
                  label={(count) => (count > 0 ? `Notifications, ${count} unread` : "Notifications")}
                >
                  <Bell aria-hidden />
                </IconLink>
              </div>

              <IconLink
                href="/messages"
                count={unreadMessages}
                label={(count) => (count > 0 ? `Messages, ${count} unread` : "Messages")}
              >
                <MessageCircle aria-hidden />
              </IconLink>
            </>
          )}

          <IconLink
            href="/cart"
            count={cartCount}
            label={(count) => (count > 0 ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart")}
          >
            <ShoppingCart aria-hidden />
          </IconLink>

          <AccountMenu />
        </div>
      </div>
    </header>
  );
}