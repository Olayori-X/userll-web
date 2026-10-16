import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RequireVerifiedUser } from "@/components/layout/require-verified-user";
import { OrderDetail } from "@/components/orders/order-detail";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false }, // a private page, nothing for search engines
};

/** "ORD-" and ten capital letters or digits: how the API makes order numbers. Anything else cannot be an order. */
const ORDER_NUMBER = /^ORD-[0-9A-Z]{10}$/;

type OrderPageProps = {
  params: Promise<{ orderNumber: string }>;
};

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderNumber: raw } = await params;

  // Someone who typed or pasted the number in lower case still gets their order.
  const orderNumber = decodeURIComponent(raw).toUpperCase();

  if (!ORDER_NUMBER.test(orderNumber)) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <RequireVerifiedUser
        next={`/orders/${orderNumber}`}
        loginTitle="Log in to see your order"
        loginText="Log in with the account you ordered with."
        verifyText="Confirm your email address to see your order."
      >
        <OrderDetail orderNumber={orderNumber} />
      </RequireVerifiedUser>
    </div>
  );
}