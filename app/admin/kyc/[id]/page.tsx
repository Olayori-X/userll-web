import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KycReview } from "@/components/admin/kyc-review";

export const metadata: Metadata = {
  title: "Identity check",
};

type KycReviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function KycReviewPage({ params }: KycReviewPageProps) {
  const { id: raw } = await params;

  // A submission's address is its number. Anything else cannot be one, so there is nothing to ask the API about.
  if (!/^[1-9][0-9]{0,9}$/.test(raw)) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <KycReview id={Number(raw)} />
    </div>
  );
}