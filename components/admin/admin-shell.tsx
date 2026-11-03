"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  FileWarning,
  Gauge,
  History,
  LogOut,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  ShieldHalf,
  Star,
  Store,
  Undo2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { PageNotice, RequireVerifiedUser } from "@/components/layout/require-verified-user";
import { useSession } from "@/components/providers/session-provider";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

/** The admin's pages. The first two are where the API's notifications for admins lead (/admin/disputes/…, /admin/kyc/…). */
const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: Gauge, exact: true },
  { href: "/admin/kyc", label: "Identity checks", icon: ShieldCheck },
  { href: "/admin/disputes", label: "Disputes", icon: FileWarning },
  { href: "/admin/payments", label: "Payments", icon: ReceiptText },
  { href: "/admin/refunds", label: "Refunds", icon: Undo2 },
  { href: "/admin/payouts", label: "Payouts", icon: Banknote },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/listings", label: "Listings", icon: PackageSearch },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/audit", label: "Audit log", icon: History },
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

/** The frame itself: sidebar on wide screens, a row of tabs on phones, a top bar saying whose console this is. */
function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useSession();

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <aside className="hidden border-r border-sidebar-border bg-sidebar lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex h-16 shrink-0 items-center gap-2 px-5">
          <Logo height={30} href="/admin" />
          <span className="rounded-full bg-foreground px-2 py-0.5 text-[11px] font-bold tracking-wide text-background uppercase">Admin</span>
        </div>

        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="grid gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <SideLink item={item} pathname={pathname} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid gap-1 border-t border-sidebar-border p-3">
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
            <div className="flex items-center gap-2 lg:hidden">
              <Logo height={28} href="/admin" />
              <span className="rounded-full bg-foreground px-2 py-0.5 text-[11px] font-bold tracking-wide text-background uppercase">Admin</span>
            </div>

            <div className="ml-auto flex items-center gap-2 text-sm">
              {user && (
                <>
                  <Avatar name={user.name} size="sm" />
                  <span className="hidden max-w-48 truncate font-medium sm:inline">{user.name}</span>
                </>
              )}
            </div>
          </div>

          {/* Phones: the sidebar's links as a row of tabs that scrolls sideways. */}
          <nav aria-label="Admin" className="border-t border-border lg:hidden">
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

/** Only administrators belong here. This decides what is shown: the API refuses everyone else on its own. */
function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useSession();

  if (user?.role !== "admin") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 py-10">
        <PageNotice icon={<ShieldHalf className="size-7" aria-hidden />} title="This area is for administrators">
          <p className="max-w-sm text-sm text-muted-foreground">Your account doesn&apos;t have access to the admin console.</p>
          <Link href="/" className={buttonVariants({ size: "lg" })}>
            Back to Userll
          </Link>
        </PageNotice>
      </div>
    );
  }

  return <>{children}</>;
}

/** Wraps every page under /admin: the sign-in and "not an admin" screens, and the frame for a real admin. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <RequireVerifiedUser
      next={pathname}
      loginTitle="Log in to the admin console"
      loginText="Log in with your administrator account."
      verifyText="Confirm your email address to use the admin console."
      className="flex min-h-dvh items-center justify-center px-4 py-10"
    >
      <AdminOnly>
        <Frame>{children}</Frame>
      </AdminOnly>
    </RequireVerifiedUser>
  );
}