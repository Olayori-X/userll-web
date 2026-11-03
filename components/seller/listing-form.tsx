"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { applyApiErrors } from "@/lib/form-errors";
import { formatNaira, koboToNairaInput, nairaForApi, nairaToKobo } from "@/lib/money";
import { NIGERIAN_STATES, isNigerianState } from "@/lib/nigerian-states";
import type { Category } from "@/lib/types/catalog";
import type { ListingInput, SellerListing } from "@/lib/types/seller-listings";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// These are the API's DEFAULT limits. They are server settings, so if you change them in Laravel's config,
// change them here too. The API checks again whatever this form says.
const MIN_PRICE_KOBO = 10_000; // ₦100
const MAX_PRICE_KOBO = 10_000_000_000; // ₦100,000,000
const MAX_DELIVERY_KOBO = 5_000_000; // ₦50,000
const MAX_STOCK = 100_000;
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 5000;

const listingSchema = z.object({
  category_id: z.string().min(1, "Choose a category."),
  title: z.string().trim().min(5, "Give it a title of at least 5 characters.").max(TITLE_MAX, `Keep the title under ${TITLE_MAX} characters.`),
  description: z
    .string()
    .trim()
    .min(20, "Describe it in at least 20 characters, so buyers know what they're getting.")
    .max(DESCRIPTION_MAX, `Keep the description under ${DESCRIPTION_MAX} characters.`),
  price: z
    .string()
    .trim()
    .min(1, "Enter a price.")
    .refine((value) => nairaToKobo(value) !== null, "Enter the price in naira, for example 25000 or 25000.50.")
    .refine((value) => (nairaToKobo(value) ?? Infinity) >= MIN_PRICE_KOBO, `The lowest price is ${formatNaira(MIN_PRICE_KOBO)}.`)
    .refine((value) => (nairaToKobo(value) ?? 0) <= MAX_PRICE_KOBO, `The highest price is ${formatNaira(MAX_PRICE_KOBO)}.`),
  delivery_fee: z
    .string()
    .trim()
    .refine((value) => value === "" || nairaToKobo(value) !== null, "Enter the delivery fee in naira, or leave it empty for free delivery.")
    .refine((value) => value === "" || (nairaToKobo(value) ?? 0) <= MAX_DELIVERY_KOBO, `The highest delivery fee is ${formatNaira(MAX_DELIVERY_KOBO)}.`),
  condition: z.enum(["new", "used"], { error: "Choose new or used." }),
  stock: z
    .string()
    .trim()
    .regex(/^\d{1,6}$/, "Enter how many you have, as a whole number.")
    .refine((value) => Number(value) <= MAX_STOCK, `You can list up to ${MAX_STOCK.toLocaleString("en-NG")} at a time.`),
  state: z.string().min(1, "Choose a state."),
  city: z.string().trim().min(1, "Enter the city or town.").max(60, "That name is too long."),
});

type ListingValues = z.infer<typeof listingSchema>;

const FIELDS = ["category_id", "title", "description", "price", "delivery_fee", "condition", "stock", "state", "city"] as const;

const CHIP =
  "inline-flex cursor-pointer items-center rounded-full border border-input bg-card px-4 py-1.5 text-sm font-medium transition-colors " +
  "hover:border-primary/50 peer-checked:border-primary peer-checked:bg-accent peer-checked:text-accent-foreground " +
  "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/40";

type ListingFormProps = {
  /** The active categories, to choose from. */
  categories: Category[];
  /** The listing being changed. Leave it out for a new one. */
  listing?: SellerListing;
  submitLabel: string;
  /** Saves it. If this throws the API's error, the form shows it under the right field. */
  onSubmit: (values: ListingInput) => Promise<unknown>;
  /** Shown between the fields and the button: the photos, when creating. */
  children?: ReactNode;
};

export function ListingForm({ categories, listing, submitLabel, onSubmit, children }: ListingFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ListingValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      category_id: listing?.category ? String(listing.category.id) : "",
      title: listing?.title ?? "",
      description: listing?.description ?? "",
      price: listing ? koboToNairaInput(listing.price) : "",
      delivery_fee: listing && listing.delivery_fee > 0 ? koboToNairaInput(listing.delivery_fee) : "",
      condition: listing?.condition ?? "new",
      stock: listing ? String(listing.stock) : "1",
      state: listing?.location.state ?? "",
      city: listing?.location.city ?? "",
    },
  });

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const save = handleSubmit(async (values) => {
    setFormError(null);

    // Already checked above, so these always have a value. The check is only here to keep the types honest.
    const price = nairaForApi(values.price);
    const deliveryFee = nairaForApi(values.delivery_fee === "" ? "0" : values.delivery_fee);

    if (!price || !deliveryFee) return;

    try {
      await onSubmit({
        category_id: Number(values.category_id),
        title: values.title,
        description: values.description,
        price, // NAIRA text, as the API wants it
        delivery_fee: deliveryFee,
        condition: values.condition,
        stock: Number(values.stock),
        state: values.state,
        city: values.city,
      });
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  });

  const titleLength = watch("title")?.length ?? 0;
  const descriptionLength = watch("description")?.length ?? 0;

  // A category an admin has since switched off must stay choosable on the listing that already has it.
  const currentCategory = listing?.category;
  const listed = new Set(categories.flatMap((category) => [category.id, ...category.children.map((child) => child.id)]));
  const missingCategory = currentCategory && !listed.has(currentCategory.id) ? currentCategory : null;

  // An older listing may hold a state typed freely before the list existed. Keep it choosable so it does not vanish.
  const oddState = listing?.location.state && !isNigerianState(listing.location.state) ? listing.location.state : null;

  return (
    <form onSubmit={save} noValidate className="grid gap-6">
      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField label="Title" error={errors.title?.message} hint="What it is, in a few words: brand, model, size.">
        {(control) => (
          <>
            <Input maxLength={TITLE_MAX} placeholder="Wireless noise-cancelling headphones" {...register("title")} {...control} />
            <p className="text-right text-xs text-muted-foreground" aria-hidden>
              {titleLength} / {TITLE_MAX}
            </p>
          </>
        )}
      </FormField>

      <FormField label="Category" error={errors.category_id?.message}>
        {(control) => (
          <Select {...register("category_id")} {...control}>
            <option value="">Choose a category</option>
            {missingCategory && <option value={missingCategory.id}>{missingCategory.name}</option>}
            {categories.map((category) =>
              category.children.length > 0 ? (
                <optgroup key={category.id} label={category.name}>
                  <option value={category.id}>All {category.name}</option>
                  {category.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ),
            )}
          </Select>
        )}
      </FormField>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold">Condition</legend>

        <div className="flex gap-2">
          {[
            { value: "new", label: "Brand new" },
            { value: "used", label: "Used" },
          ].map((option) => (
            <label key={option.value}>
              <input type="radio" value={option.value} className="peer sr-only" {...register("condition")} />
              <span className={CHIP}>{option.label}</span>
            </label>
          ))}
        </div>

        {errors.condition && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errors.condition.message}
          </p>
        )}
      </fieldset>

      <FormField label="Description" error={errors.description?.message} hint="What's included, any flaws, the size, the warranty. Honest descriptions mean fewer disputes.">
        {(control) => (
          <>
            <Textarea rows={6} maxLength={DESCRIPTION_MAX} placeholder="Tell buyers what they're getting." {...register("description")} {...control} />
            <p className="text-right text-xs text-muted-foreground" aria-hidden>
              {descriptionLength} / {DESCRIPTION_MAX}
            </p>
          </>
        )}
      </FormField>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField label="Price (₦)" error={errors.price?.message} hint={`In naira. At least ${formatNaira(MIN_PRICE_KOBO)}.`}>
          {(control) => <Input inputMode="decimal" autoComplete="off" maxLength={14} placeholder="25000" {...register("price")} {...control} />}
        </FormField>

        <FormField
          label="Delivery fee (₦)"
          optional
          error={errors.delivery_fee?.message}
          hint="In naira. Leave it empty for free delivery. A buyer who orders several of your items pays only the highest fee."
        >
          {(control) => <Input inputMode="decimal" autoComplete="off" maxLength={12} placeholder="1500" {...register("delivery_fee")} {...control} />}
        </FormField>
      </div>

      <FormField label="How many you have" error={errors.stock?.message} hint="At 0, a live listing shows as sold out until you add more.">
        {(control) => <Input inputMode="numeric" autoComplete="off" maxLength={6} className="sm:max-w-40" {...register("stock")} {...control} />}
      </FormField>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField label="State" error={errors.state?.message} hint="Where it ships from.">
          {(control) => (
            <Select {...register("state")} {...control}>
              <option value="">Choose a state</option>
              {oddState && <option value={oddState}>{oddState}</option>}
              {NIGERIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField label="City or town" error={errors.city?.message}>
          {(control) => <Input maxLength={60} placeholder="Ikeja" {...register("city")} {...control} />}
        </FormField>
      </div>

      {children}

      <Button type="submit" size="lg" className={cn("w-full sm:w-auto sm:justify-self-start")} loading={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}