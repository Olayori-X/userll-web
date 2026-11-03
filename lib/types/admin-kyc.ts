/** The admin's side of the identity checks. */

import type { IdType, KycStatus } from "@/lib/types/seller";

/** How well the legal name on the ID fits the name the seller's bank holds. Only on a single submission. */
export type NameMatch = "match" | "partial" | "mismatch" | "no_bank_account";

/** One identity check waiting for, or already given, a decision. */
export type AdminKycSubmission = {
  id: number;
  status: KycStatus;
  legal_name: string;
  id_type: IdType;
  /** "NIN slip", "International passport", and so on, ready to show. */
  id_type_label: string;
  /** Why it was turned down. What the seller reads, so it says what to fix. Null unless rejected. */
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  seller: {
    /** The seller's user id. */
    id: number;
    name: string | null;
    email: string | null;
    /** Null if the seller has no shop (they cannot have submitted without one, but the data allows it). */
    store_name: string | null;
  };
  /**
   * Where the API serves the photo from. DO NOT use it in the browser: it points straight at Laravel, where the
   * browser has no token. Use kycPhotoUrl(id) in lib/api/admin.ts, which goes through our own proxy.
   */
  photo_path: string;
  /** Only present when a single submission is fetched, not in the list. */
  name_match?: NameMatch;
};