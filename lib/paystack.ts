/**
 * Where we are willing to send a buyer to pay.
 *
 * The payment address comes from our own API, so this should never fail. It is a safety net: whatever the
 * API says, a buyer is only ever sent to an https address on paystack.com, so a mistake or a tampered
 * answer could never turn into a redirect to some other website.
 */
export function isPaystackUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "https:" && (url.hostname === "paystack.com" || url.hostname.endsWith(".paystack.com"));
  } catch {
    return false;
  }
}