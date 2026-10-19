/**
 * Opening a shop and getting it ready to be paid: the shop profile, the identity check, the payout account.
 * All of it needs a login and a verified email. Everything except opening the shop also needs a shop already.
 */

import { api } from "@/lib/api";
import type { Wrapped } from "@/lib/types/common";
import type {
  Bank,
  KycInput,
  KycSubmission,
  NewSellerProfile,
  PayoutAccount,
  SellerKyc,
  SellerProfile,
  SellerProfileChanges,
} from "@/lib/types/seller";

const unwrap = <T>({ data }: Wrapped<T>) => data;

// ---------------------------------------------------------------- the shop

/**
 * Opens a shop for the logged-in person. Field errors: `store_name` (too short, or taken), `state`, `city`.
 * A person who already has a shop gets a 409 ("You already have a seller profile.").
 * Afterwards the account's `is_seller` is true, so refresh the session (see useSession().refresh).
 */
export function createSellerProfile(input: NewSellerProfile) {
  return api.post<Wrapped<SellerProfile>>("/seller/profile", input).then(unwrap);
}

export function getSellerProfile() {
  return api.get<Wrapped<SellerProfile>>("/seller/profile").then(unwrap);
}

/** Changes some details of the shop. The shop's web address never changes, even when the name does. */
export function updateSellerProfile(changes: SellerProfileChanges) {
  return api.patch<Wrapped<SellerProfile>>("/seller/profile", changes).then(unwrap);
}

// ---------------------------------------------------------------- the identity check

/** Where the seller stands with their identity check, what they may send, and what they sent before. */
export function getKyc() {
  return api.get<Wrapped<SellerKyc>>("/seller/kyc").then(unwrap);
}

/**
 * Sends the legal name and a photo of an ID for an admin to review. Sent as a form (a photo cannot go as JSON).
 * Field errors: `legal_name` (too short, or not matching the name on the payout account), `id_type`,
 * and `id_photo` (wrong type, too small, too big). A 503 means the photo could not be stored: try again.
 * Only possible when `can_submit` is true.
 */
export function submitKyc({ legal_name, id_type, id_photo }: KycInput) {
  const form = new FormData();

  form.append("legal_name", legal_name);
  form.append("id_type", id_type);
  form.append("id_photo", id_photo);

  return api.post<Wrapped<KycSubmission>>("/seller/kyc", form).then(unwrap);
}

// ---------------------------------------------------------------- the payout account

/** The banks to choose from, sorted by name. A 502 means the list is unavailable for a moment. */
export function getBanks() {
  return api.get<Wrapped<Bank[]>>("/seller/banks").then(unwrap);
}

/** The current payout account, or null when none is set up. */
export function getPayoutAccount() {
  return api.get<{ data: PayoutAccount | null }>("/seller/payout-account").then(unwrap);
}

/**
 * Sets the payout account, or replaces the one there. The bank confirms who owns the number, and the name it
 * returns must match the name on the identity documents (when there are any). Withdrawals pause for a day
 * afterwards. Field errors: `account_number` (not 10 digits, no such account, or not in the seller's name).
 * A 502 means the bank could not be reached: nothing was saved, try again.
 */
export function savePayoutAccount(bankCode: string, accountNumber: string) {
  return api.put<Wrapped<PayoutAccount>>("/seller/payout-account", { bank_code: bankCode, account_number: accountNumber }).then(unwrap);
}