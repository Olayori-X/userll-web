"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useSellerProfile } from "@/hooks/use-seller";
import { useUnreadCount } from "@/hooks/use-chat";
import { useUnreadNotificationCount } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { IconLink } from "@/components/layout/icon-link";
import { PageNotice, RequireVerifiedUser } from "@/components/layout/require-verified-user";
import { useSession } from "@/components/providers/session-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

/** The seller's pages. These are the same addresses the API's notifications link to. */
const NAV: NavItem[] = [
  { href: "/seller", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/seller/listings", label: "Products", icon: Package },
  { href: "/seller/orders", label: "Orders", icon: ShoppingBag },
  { href: "/seller/wallet", label: "Wallet", icon: Wallet },
  { href: "/seller/reviews", label: "Reviews", icon: Star },
  { href: "/seller/kyc", label: "Verification", icon: ShieldCheck },
  { href: "/seller/profile", label: "Shop profile", icon: Settings },
];

function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SideLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60",
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}

/** The frame itself: sidebar on wide screens, a row of tabs on phones, a top bar with the shop's icons. */
function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useSession();
  const profile = useSellerProfile();
  const unreadMessages = useUnreadCount();
  const unreadNotifications = useUnreadNotificationCount();

  const storeName = profile.data?.store_name ?? user?.name ?? "My shop";
  const shopSlug = profile.data?.slug;

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <aside className="hidden border-r border-sidebar-border bg-sidebar lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Logo height={30} href="/seller" />
        </div>

        <nav aria-label="Seller" className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="grid gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <SideLink item={item} pathname={pathname} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid gap-1 border-t border-sidebar-border p-3">
          {shopSlug && (
            <Link
              href={`/sellers/${shopSlug}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60"
            >
              <ExternalLink className="size-[18px] shrink-0" aria-hidden />
              View my shop
            </Link>
          )}
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60"
          >
            <Store className="size-[18px] shrink-0" aria-hidden />
            Back to Userll
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60"
          >
            <LogOut className="size-[18px] shrink-0" aria-hidden />
            Log out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-8">
            <div className="lg:hidden">
              <Logo height={28} href="/seller" />
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <IconLink
                href="/notifications"
                count={unreadNotifications}
                label={(count) => (count > 0 ? `Notifications, ${count} unread` : "Notifications")}
              >
                <Bell aria-hidden />
              </IconLink>

              <IconLink
                href="/messages"
                count={unreadMessages}
                label={(count) => (count > 0 ? `Messages, ${count} unread` : "Messages")}
              >
                <MessageCircle aria-hidden />
              </IconLink>

              <Link
                href="/seller/profile"
                className="ml-1 flex items-center gap-2 rounded-full border border-border bg-card py-1 pr-3 pl-1 text-sm font-medium transition-colors hover:border-primary/50"
              >
                <Avatar name={storeName} size="sm" />
                <span className="hidden max-w-40 truncate sm:inline">{storeName}</span>
              </Link>
            </div>
          </div>

          {/* Phones: the sidebar's links as a row of tabs that scrolls sideways. */}
          <nav aria-label="Seller" className="border-t border-border lg:hidden">
            <ul className="flex gap-2 overflow-x-auto px-4 py-2 sm:px-6">
              {NAV.map((item) => {
                const active = isActive(pathname, item);

                return (
                  <li key={item.href} className="shrink-0">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                        active ? "border-primary bg-accent text-accent-foreground" : "border-input bg-card hover:border-primary/50",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li className="shrink-0">
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="inline-flex items-center rounded-full border border-input bg-card px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-primary/50"
                >
                  Log out
                </button>
              </li>
            </ul>
          </nav>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/** A logged-in, verified person who has not opened a shop yet belongs on the sign-up page, not here. */
function SellerOnly({ children }: { children: ReactNode }) {
  const { user } = useSession();

  if (!user?.is_seller) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 py-10">
        <PageNotice icon={<Store className="size-7" aria-hidden />} title="You don't have a shop yet">
          <p className="max-w-sm text-sm text-muted-foreground">Open one in a minute, and start selling.</p>
          <Link href="/sell" className={buttonVariants({ size: "lg" })}>
            Open a shop
          </Link>
          <Button variant="link" onClick={() => window.history.back()}>
            Go back
          </Button>
        </PageNotice>
      </div>
    );
  }

  return <>{children}</>;
}

/** Wraps every page under /seller: the sign-in and "no shop yet" screens, and the frame for a real seller. */
export function SellerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <RequireVerifiedUser
      next={pathname}
      loginTitle="Log in to manage your shop"
      loginText="Log in with your seller account."
      verifyText="Confirm your email address to manage your shop."
      className="flex min-h-dvh items-center justify-center px-4 py-10"
    >
      <SellerOnly>
        <Frame>{children}</Frame>
      </SellerOnly>
    </RequireVerifiedUser>
  );
}