"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useSellerProfile } from "@/hooks/use-seller";
import { useSession } from "@/components/providers/session-provider";
import { buttonVariants } from "@/components/ui/button";

/** The top of the dashboard: a greeting, and a link to the shop as buyers see it. */
export function DashboardHeading() {
  const { user } = useSession();
  const profile = useSellerProfile();

  const firstName = user?.name.trim().split(/\s+/)[0];
  const slug = profile.data?.slug;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{firstName ? `Welcome, ${firstName}` : "Dashboard"}</h1>
        <p className="text-sm text-muted-foreground">
          {profile.data ? `Here's how ${profile.data.store_name} is doing.` : "Here's how your shop is doing."}
        </p>
      </div>

      {slug && (
        <Link href={`/sellers/${slug}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ExternalLink aria-hidden />
          View my shop
        </Link>
      )}
    </div>
  );
}