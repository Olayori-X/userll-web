import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EditListing } from "@/components/seller/edit-listing";
import { Alert } from "@/components/ui/alert";
import { getCategories } from "@/lib/api/catalog";
import type { Category } from "@/lib/types/catalog";

export const metadata: Metadata = {
  title: "Edit product",
};

type EditListingPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string | string[] }>;
};

export default async function EditListingPage({ params, searchParams }: EditListingPageProps) {
  const { id: raw } = await params;

  // A seller's own listings are addressed by number. Anything else cannot be one, so there is nothing to ask the API about.
  if (!/^[1-9][0-9]{0,9}$/.test(raw)) notFound();

  const query = await searchParams;
  const justCreated = (Array.isArray(query.new) ? query.new[0] : query.new) === "1";

  // Read here, on the server, so the form opens with its category list already in it. If it cannot be read, the page
  // says so instead of showing a form that cannot offer a category.
  let categories: Category[] | null = null;

  try {
    categories = await getCategories();
  } catch (error) {
    console.error("The category list could not be loaded:", error);
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-3">
        <Link href="/seller/listings" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" aria-hidden />
          Products
        </Link>

        <h1 className="text-2xl font-bold tracking-tight">Edit product</h1>
      </div>

      {categories ? (
        <EditListing id={Number(raw)} categories={categories} justCreated={justCreated} />
      ) : (
        <Alert variant="error" title="We couldn't load the categories">
          Something went wrong on our side, so the form can&apos;t open. Please{" "}
          <Link href={`/seller/listings/${raw}`} className="font-semibold underline">
            try again
          </Link>{" "}
          in a moment.
        </Alert>
      )}
    </div>
  );
}