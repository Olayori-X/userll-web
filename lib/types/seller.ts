/** A seller's own side: their shop profile, identity check and payout account. */

import type { SellerSummary } from "@/lib/types/catalog";

/**
 * The seller's own shop profile. GET /seller/profile returns the same fields the public sees: it has no
 * separate "private" fields. The identity-check status is its own call (see SellerKyc).
 */
export type SellerProfile = SellerSummary;

/** What to send to open a shop. */
export type NewSellerProfile = {
  /** 3 to 60 characters, and no other shop may have the same name. */
  store_name: string;
  /** Up to 1000 characters. */
  bio?: string;
  state: string;
  city: string;
};

/** What to send to change the shop's details. Everything is optional: send only what changed. The shop's address (slug) never changes. */
export type SellerProfileChanges = Partial<NewSellerProfile> & {
  /** Send null or "" to clear the bio. */
  bio?: string | null;
};

/** "none": never submitted. "pending": waiting for an admin. "verified": done. "rejected": try again with a better photo. */
export type KycStatus = "none" | "pending" | "verified" | "rejected";

export type IdType = "nin_slip" | "passport" | "drivers_license" | "voters_card";

/** One thing the seller sent for review. The photo itself is never sent back. */
export type KycSubmission = {
  id: number;
  status: KycStatus;
  legal_name: string;
  id_type: IdType;
  /** "NIN slip", "International passport", and so on, ready to show. */
  id_type_label: string;
  /** Why an admin turned it down, in their words. Only when status is "rejected". */
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

/** Where the seller stands with their identity check. */
export type SellerKyc = {
  status: KycStatus;
  verified_at: string | null;
  /** True when nothing was sent yet or the last one was rejected. False while one is waiting or once verified. */
  can_submit: boolean;
  /** The kinds of ID the seller can choose from, with their labels. */
  id_types: { value: IdType; label: string }[];
  /** The newest submission, or null when there is none. */
  latest: KycSubmission | null;
  /** Up to the last 10, newest first. */
  history: KycSubmission[];
};

/**
 * What to send to submit an identity check: sent as a form with a photo, not as JSON.
 * The photo must be a JPG or PNG, at least 400 x 300 pixels, and up to about 5 MB.
 */
export type KycInput = {
  /** 3 to 120 characters: the name exactly as it is on the ID. It must match the name on the payout account. */
  legal_name: string;
  id_type: IdType;
  id_photo: File;
};

/** A bank the seller can pay out to. The list comes sorted by name. */
export type Bank = {
  name: string;
  /** The bank's code, such as "057". Send this, not the name. */
  code: string;
};

/** The seller's payout account. The full account number is never sent back. */
export type PayoutAccount = {
  bank_code: string;
  bank_name: string;
  /** The name the BANK holds for this account. The seller cannot type it in. */
  account_name: string;
  /** Only the last four digits show: "******6789". */
  account_number: string;
  is_verified: boolean;
  /** After a new account is saved, withdrawals are paused until this time (24 hours by default). Null when nothing is held. */
  payouts_held_until: string | null;
};