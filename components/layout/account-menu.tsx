"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MailWarning,
  MessageCircle,
  Package,
  Shield,
  Store,
} from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * The right-hand end of the site header: Log in / Sign up for visitors, the account menu for people who are
 * logged in. What the menu offers only decides what is shown. The API still checks who may do what.
 */
export function AccountMenu() {
  const { user, status, signOut } = useSession();
  const pathname = usePathname();

  // After logging in or signing up, bring people back to the page they were on.
  const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;

  // Holds the space while we find out who is logged in, so the header does not jump.
  if (status === "loading") return <div className="size-10 animate-pulse rounded-full bg-muted" aria-hidden />;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href={`/login${next}`} className={buttonVariants({ size: "sm" })}>
          Log in
        </Link>
        <Link href={`/register${next}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")}>
          Sign up
        </Link>
      </div>
    );
  }

  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${user.name}`}
        render={<Button variant="ghost" className="h-10 gap-2 rounded-full pr-3 pl-1" />}
      >
        <Avatar name={user.name} size="sm" />
        <span className="hidden max-w-28 truncate sm:inline">{firstName}</span>
        <ChevronDown className="text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel>
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>

        {!user.email_verified && (
          <DropdownMenuItem render={<Link href="/verify-email" />} className="bg-warning-soft text-warning [&_svg]:text-warning">
            <MailWarning aria-hidden />
            Verify your email
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href="/orders" />}>
          <Package aria-hidden />
          My orders
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/messages" />}>
          <MessageCircle aria-hidden />
          Messages
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/notifications" />}>
          <Bell aria-hidden />
          Notifications
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {user.is_seller ? (
          <DropdownMenuItem render={<Link href="/seller" />}>
            <LayoutDashboard aria-hidden />
            Seller dashboard
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem render={<Link href="/sell" />}>
            <Store aria-hidden />
            Start selling
          </DropdownMenuItem>
        )}

        {user.role === "admin" && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <Shield aria-hidden />
            Admin console
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}