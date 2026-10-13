import Form from "next/form";
import { LifeBuoy, Lock, Search, ShieldCheck, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/** What makes buying here safe. Each line describes something the platform really does. */
const TRUST: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ShieldCheck, title: "Verified sellers", text: "Look for the verified badge on shops." },
  { icon: Lock, title: "Secure payments", text: "We hold your money until your order arrives." },
  { icon: LifeBuoy, title: "Dispute protection", text: "Report a problem and we step in." },
];

/** The top of the landing page: headline, a big search box and the three promises. */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_1fr] md:py-16 lg:px-8">
        <div className="grid gap-6">
          <h1 className="text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl">
            Everything you need,
            <span className="block text-primary">from real people</span>
          </h1>

          <p className="max-w-md text-base text-muted-foreground">
            Discover amazing products from trusted sellers, all in one place.
          </p>

          {/* A plain form: it opens /listings?q=..., with no code needed in the browser. next/form makes it a soft page change. */}
          <Form
            action="/listings"
            role="search"
            className="flex w-full max-w-xl items-center gap-2 rounded-full border border-input bg-card p-1.5 pl-4 shadow-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25"
          >
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              type="search"
              name="q"
              maxLength={100} // the API's limit
              placeholder="Search for products"
              aria-label="Search for products"
              autoComplete="off"
              enterKeyHint="search"
              className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
            />
            <Button type="submit" className="rounded-full px-5">
              Search
            </Button>
          </Form>

          <ul className="grid gap-4 pt-2 sm:grid-cols-3">
            {TRUST.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="grid gap-0.5">
                  <span className="text-sm font-semibold">{title}</span>
                  <span className="text-xs leading-snug text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Decoration only. A photo like the one in the mockup can replace this later. */}
        <div aria-hidden className="relative hidden items-center justify-center md:flex">
          <div className="absolute size-80 rounded-full bg-coral/30 blur-2xl" />
          <div className="relative flex size-72 items-center justify-center rounded-[3rem] bg-accent">
            <Logo variant="mark" href={null} height={180} />
          </div>
        </div>
      </div>
    </section>
  );
}