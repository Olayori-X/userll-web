import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Banknote, Camera, PackageCheck, Store, type LucideIcon } from "lucide-react";
import { RequireVerifiedUser } from "@/components/layout/require-verified-user";
import { BecomeSellerForm } from "@/components/seller/become-seller-form";

export const metadata: Metadata = {
  title: "Sell on Userll",
  description: "Open a shop on Userll, list what you sell, and get paid safely when your buyers receive their orders.",
};

/** How selling works. Each line describes something the platform really does. */
const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Store,
    title: "Open your shop",
    text: "Choose a name and tell buyers where you are. It takes a minute and you can start listing straight away.",
  },
  {
    icon: Camera,
    title: "List what you sell",
    text: "Add photos, a price and your delivery fee. Publish when it's ready, and take it down any time.",
  },
  {
    icon: PackageCheck,
    title: "Ship when it sells",
    text: "You get a message when an order is paid. Ship it by the deadline and add the tracking details for the buyer.",
  },
  {
    icon: BadgeCheck,
    title: "Verify before your first payout",
    text: "Confirm your identity and add your bank account. You only need this when you're ready to withdraw, not to start selling.",
  },
  {
    icon: Banknote,
    title: "Get paid safely",
    text: "The buyer's money is held until they confirm their order arrived. Then it's yours to withdraw to your bank. Every order shows exactly what you'll earn after our commission.",
  },
];

export default function SellPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="mb-8 grid max-w-2xl gap-3">
        <h1 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
          Sell on Userll, <span className="text-primary">get paid safely</span>
        </h1>
        <p className="text-base text-muted-foreground">
          Reach buyers, and never chase a payment. We hold the money until your customer has their order.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-12">
        {/* On phones the form comes first: it is what people came to do. On wide screens it sits on the right. */}
        <section aria-labelledby="open-heading" className="order-first rounded-2xl border border-border bg-card p-6 shadow-sm lg:order-last lg:sticky lg:top-28 sm:p-8">
          <h2 id="open-heading" className="mb-5 text-xl font-bold tracking-tight">
            Open your shop
          </h2>

          <RequireVerifiedUser
            next="/sell"
            loginTitle="Log in to open your shop"
            loginText={
              <>
                You need an account to sell. New here?{" "}
                <Link href="/register?next=%2Fsell" className="font-semibold text-primary hover:underline">
                  Create one
                </Link>
                .
              </>
            }
            verifyText="Confirm your email address, then come back to open your shop."
          >
            <BecomeSellerForm />
          </RequireVerifiedUser>
        </section>

        <section aria-labelledby="how-heading" className="grid gap-5">
          <h2 id="how-heading" className="text-xl font-bold tracking-tight">
            How it works
          </h2>

          <ol className="grid gap-5">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="grid gap-0.5">
                  <h3 className="font-semibold">
                    <span className="sr-only">Step {index + 1}: </span>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}