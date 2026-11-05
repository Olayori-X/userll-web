/** The admin's side of accounts: finding people, seeing their record, suspending and restoring them. */

import type { KycStatus } from "@/lib/types/seller";

export type UserType = "admin" | "seller" | "buyer";

export type UserAccountStatus = "active" | "suspended";

/** The numbers an admin wants before deciding anything about an account. Every amount is KOBO. */
export type UserStats = {
  /** What the person has done as a buyer. Everyone has this. */
  as_buyer: {
    /** Paid orders. */
    orders: number;
    completed_orders: number;
    disputes_opened: number;
    reviews_written: number;
  };
  /** Only for someone with a shop. */
  as_seller?: {
    /** How many listings they have in each state. */
    listings: Record<"draft" | "active" | "sold_out" | "removed", number>;
    orders: number;
    completed_orders: number;
    /** What buyers paid for their completed orders. */
    sales_total: number;
    /** Our commission on those. */
    commission_paid: number;
    /** Disputes buyers opened against their orders. A high number next to a low order count is worth a look. */
    disputes_against: number;
    wallet: {
      /** What they can withdraw now. */
      available: number;
      /** Held until buyers confirm. */
      pending: number;
    };
    payouts: {
      count: number;
      paid_total: number;
      in_progress_total: number;
    };
  };
};

/** An account as an admin sees it. The list has no `stats`: they come with a single user. */
export type AdminUser = {
  id: number;
  name: string;
  email: string;
  type: UserType;
  status: UserAccountStatus;
  email_verified: boolean;
  suspended_at: string | null;
  /** Why it was suspended. For admins only: the person is never shown it. */
  suspension_reason: string | null;
  created_at: string;
  /** Their shop, if they have one. */
  seller: {
    store_name: string;
    /** The shop's public address. */
    slug: string;
    kyc_status: KycStatus;
    kyc_verified_at: string | null;
    reviews_count: number;
    /** 0 when there are no reviews yet. */
    rating_average: number;
  } | null;
  /** Only on a single user. */
  stats?: UserStats;
};