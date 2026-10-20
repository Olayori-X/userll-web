import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellerOrderDetail } from "@/components/seller/seller-order-detail";

export const metadata: Metadata = {
  title: "Order",
};

/** "ORD-" and ten capital letters or digits: how the API makes order numbers. Anything else cannot be an order. */
const ORDER_NUMBER = /^ORD-[0-9A-Z]{10}$/;

type SellerOrderPageProps = {
  params: Promise<{ orderNumber: string }>;
};

export default async function SellerOrderPage({ params }: SellerOrderPageProps) {
  const { orderNumber: raw } = await params;

  // Someone who typed or pasted the number in lower case still gets their order.
  const orderNumber = decodeURIComponent(raw).toUpperCase();

  if (!ORDER_NUMBER.test(orderNumber)) notFound();

  return <SellerOrderDetail orderNumber={orderNumber} />;
}