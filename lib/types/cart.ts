/** The buyer's cart, as GET /cart and every cart change return it. */

export type CartItem = {
  /** The cart line's own id. Use it to change the quantity or remove the line. */
  id: number;
  listing_id: number;
  /** Null if the listing was deleted. Do not link to it then. */
  slug: string | null;
  /** "Unavailable item" when the listing was deleted. */
  title: string;
  image: string | null;
  store_name: string | null;
  store_slug: string | null;
  quantity: number;
  /** Kobo, for one item. */
  unit_price: number;
  unit_price_formatted: string;
  /** Kobo. The listing's own fee: only the highest fee per seller is charged. */
  delivery_fee: number;
  /** Kobo: unit_price x quantity. */
  line_total: number;
  line_total_formatted: string;
  /** Null when the line is fine. Otherwise why it cannot be bought: "No longer available" or "Only 3 left". */
  issue: string | null;
};

/** All amounts are kobo, and every `_formatted` text is ready to show. */
export type Cart = {
  items: CartItem[];
  /** How many things in all (quantities added up), for the number on the cart icon. */
  item_count: number;
  subtotal: number;
  subtotal_formatted: string;
  /** One delivery fee per seller: the highest among that seller's items. */
  delivery_total: number;
  delivery_total_formatted: string;
  total: number;
  total_formatted: string;
  /** False while the cart is empty or any line has an issue. Disable checkout when it is false. */
  can_checkout: boolean;
};