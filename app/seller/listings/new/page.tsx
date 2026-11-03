import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateListing } from "@/components/seller/create-listing";
import { Alert } from "@/components/ui/alert";
import { getCategories } from "@/lib/api/catalog";
import type { Category } from "@/lib/types/catalog";

export const metadata: Metadata = {
  title: "Add product",
};

export default async function NewListingPage() {
  // Read here, on the server, so the form opens with its category list already in it. If it cannot be read, the form
  // is not shown at all: a form that cannot offer a category cannot be completed.
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

        <div className="grid gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Add a product</h1>
          <p className="text-sm text-muted-foreground">Good photos and an honest description sell the most.</p>
        </div>
      </div>

      {categories ? (
        <CreateListing categories={categories} />
      ) : (
        <Alert variant="error" title="We couldn't load the categories">
          Something went wrong on our side, so the form can&apos;t open. Please{" "}
          <Link href="/seller/listings/new" className="font-semibold underline">
            try again
          </Link>{" "}
          in a moment.
        </Alert>
      )}
    </div>
  );
}