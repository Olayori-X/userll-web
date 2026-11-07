import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UserDetail } from "@/components/admin/user-detail";

export const metadata: Metadata = {
  title: "Account",
};

type UserPageProps = {
  params: Promise<{ id: string }>;
};

export default async function UserPage({ params }: UserPageProps) {
  const { id: raw } = await params;

  // An account's address is its number. Anything else cannot be one, so there is nothing to ask the API about.
  if (!/^[1-9][0-9]{0,9}$/.test(raw)) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <UserDetail id={Number(raw)} />
    </div>
  );
}