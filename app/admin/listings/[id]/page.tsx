import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingReview } from "@/components/admin/listing-review";

export const metadata: Metadata = {
  title: "Listing",
};

type ListingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminListingPage({ params }: ListingPageProps) {
  const { id: raw } = await params;

  // A listing's address is its number. Anything else cannot be one, so there is nothing to ask the API about.
  if (!/^[1-9][0-9]{0,9}$/.test(raw)) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <ListingReview id={Number(raw)} />
    </div>
  );
}