/**
 * Money. The API returns every amount in KOBO (100 kobo = ₦1) as a whole number.
 *
 * Which unit to SEND depends on the field:
 *   kobo:  payout `amount` (POST /seller/payouts, GET /seller/payouts/quote?amount=)
 *   naira: listing `price` and `delivery_fee` (create and edit), search `min_price` and `max_price`
 *
 * Never convert "everything" in one place: convert per field, with the helpers below.
 */

const KOBO_PER_NAIRA = 100;

/** 2500000 -> "₦25,000". Kobo only show when there are some: 2500050 -> "₦25,000.50". */
export function formatNaira(kobo: number): string {
  const hasKobo = kobo % KOBO_PER_NAIRA !== 0;

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: hasKobo ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(kobo / KOBO_PER_NAIRA);
}

/** For tight spaces such as stat cards and chips: 4500000 -> "₦45k", 1342000000 -> "₦13.4M". Small amounts stay in full. */
export function formatNairaShort(kobo: number): string {
  const naira = kobo / KOBO_PER_NAIRA;
  const abs = Math.abs(naira);
  const trim = (n: number) => Number(n.toFixed(1));

  if (abs >= 1_000_000_000) return `₦${trim(naira / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `₦${trim(naira / 1_000_000)}M`;
  if (abs >= 10_000) return `₦${trim(naira / 1_000)}k`;

  return formatNaira(kobo);
}

/**
 * What a person typed in a naira box -> kobo, or null if it is not a valid amount.
 * Accepts "25000", "25,000", "₦25,000.50" and at most 2 decimals. Uses string maths, not floats.
 */
export function nairaToKobo(input: string | number): number | null {
  const text = String(input).replace(/[₦,\s]/g, "");

  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;

  const [whole, fraction = ""] = text.split(".");

  return Number(whole) * KOBO_PER_NAIRA + Number(fraction.padEnd(2, "0"));
}

/**
 * What to SEND for a field the API takes in naira (listing price, delivery fee, min and max price):
 * the canonical text, like "25000" or "25000.50", or null if the input is not a valid amount.
 */
export function nairaForApi(input: string | number): string | null {
  const kobo = nairaToKobo(input);

  return kobo === null ? null : koboToNairaInput(kobo);
}

/** Kobo -> text for a form box or an API naira field: 2500000 -> "25000", 2500050 -> "25000.50". */
export function koboToNairaInput(kobo: number): string {
  const whole = Math.floor(kobo / KOBO_PER_NAIRA);
  const rest = kobo % KOBO_PER_NAIRA;

  return rest === 0 ? String(whole) : `${whole}.${String(rest).padStart(2, "0")}`;
}