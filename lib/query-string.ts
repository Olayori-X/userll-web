/**
 * Turns an object into the ?a=1&b=2 part of an address. Shared by the browser client (lib/api.ts) and the
 * server-side fetcher (lib/api-server.ts), so both treat values the same way.
 */

type Primitive = string | number | boolean | null | undefined;

export type Query = Record<string, Primitive | Primitive[]>;

/**
 * "?q=shoes&condition=new", or "" when there is nothing to send.
 * Empty values are left out. A list becomes key[]=a&key[]=b, which is how Laravel reads arrays.
 */
export function toQueryString(query?: Query): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    const isList = Array.isArray(value);

    for (const item of isList ? value : [value]) {
      if (item === undefined || item === null || item === "") continue;

      // Laravel's boolean rule accepts 1 and 0, but not the text "true" or "false".
      const text = typeof item === "boolean" ? (item ? "1" : "0") : String(item);
      params.append(isList ? `${key}[]` : key, text);
    }
  }

  const text = params.toString();

  return text ? `?${text}` : "";
}