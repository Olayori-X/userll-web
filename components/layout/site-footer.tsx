import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const LINK_CLASS = "text-sm text-muted-foreground hover:text-primary hover:underline";

/** Plain links, no session needed, so this stays a server component. */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div className="grid content-start gap-3">
          <Logo height={28} />
          <p className="max-w-xs text-sm text-muted-foreground">Real people. Real products. Real progress.</p>
        </div>

        <nav aria-label="Shop" className="grid content-start gap-2.5">
          <h2 className="text-sm font-semibold">Shop</h2>
          <Link href="/listings" className={LINK_CLASS}>
            Browse products
          </Link>
          <Link href="/sell" className={LINK_CLASS}>
            Become a seller
          </Link>
        </nav>

        <nav aria-label="Account" className="grid content-start gap-2.5">
          <h2 className="text-sm font-semibold">Account</h2>
          <Link href="/login" className={LINK_CLASS}>
            Log in
          </Link>
          <Link href="/register" className={LINK_CLASS}>
            Create an account
          </Link>
        </nav>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto w-full max-w-7xl px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Userll. All rights reserved.
        </p>
      </div>
    </footer>
  );
}