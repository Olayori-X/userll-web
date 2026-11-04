import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DisputeCase } from "@/components/admin/dispute-case";

export const metadata: Metadata = {
  title: "Dispute",
};

type DisputePageProps = {
  params: Promise<{ id: string }>;
};

export default async function DisputePage({ params }: DisputePageProps) {
  const { id: raw } = await params;

  // A dispute's address is its number. Anything else cannot be one, so there is nothing to ask the API about.
  if (!/^[1-9][0-9]{0,9}$/.test(raw)) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <DisputeCase id={Number(raw)} />
    </div>
  );
}