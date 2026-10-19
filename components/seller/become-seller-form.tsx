"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { useCreateSellerProfile } from "@/hooks/use-seller";
import { applyApiErrors } from "@/lib/form-errors";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";
import { useSession } from "@/components/providers/session-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const BIO_MAX = 1000; // the API's limit

// These mirror the API's own rules, so people see problems before anything is sent. The API still checks again.
const shopSchema = z.object({
  store_name: z.string().trim().min(3, "Your shop name needs at least 3 characters.").max(60, "Your shop name can be 60 characters at most."),
  bio: z.string().trim().max(BIO_MAX, `Please keep it under ${BIO_MAX} characters.`),
  state: z.string().min(1, "Choose your state."),
  city: z.string().trim().min(1, "Enter your city or town.").max(60, "That name is too long."),
});

type ShopValues = z.infer<typeof shopSchema>;

const FIELDS = ["store_name", "bio", "state", "city"] as const;

const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 " +
  "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 md:text-sm";

export function BecomeSellerForm() {
  const router = useRouter();
  const { user, refresh } = useSession();
  const create = useCreateSellerProfile();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ShopValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: { store_name: "", bio: "", state: "", city: "" },
  });

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = form;

  // Someone who already has a shop has no business here (for example the Back button after opening it).
  useEffect(() => {
    if (user?.is_seller) router.replace("/seller");
  }, [user?.is_seller, router]);

  const submit = handleSubmit((values) => {
    setFormError(null);

    create.mutate(
      {
        store_name: values.store_name,
        state: values.state,
        city: values.city,
        ...(values.bio ? { bio: values.bio } : {}), // an empty bio is simply left out
      },
      {
        onSuccess: () => {
          router.replace("/seller");
          router.refresh();
        },
        onError: (error) => {
          // "You already have a seller profile": this screen is out of date. Reload who they are, and the effect above moves them on.
          if (error instanceof ApiError && error.status === 409) {
            void refresh();

            return;
          }

          setFormError(applyApiErrors(error, setError, FIELDS));
        },
      },
    );
  });

  const bioLength = watch("bio")?.length ?? 0;

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField label="Shop name" error={errors.store_name?.message} hint="This is the name buyers see. Pick one that is yours.">
        {(control) => <Input maxLength={60} placeholder="TechWorld Store" autoComplete="organization" {...register("store_name")} {...control} />}
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="State" error={errors.state?.message}>
          {(control) => (
            <select className={SELECT_CLASS} autoComplete="address-level1" {...register("state")} {...control}>
              <option value="">Choose a state</option>
              {NIGERIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          )}
        </FormField>

        <FormField label="City or town" error={errors.city?.message}>
          {(control) => <Input maxLength={60} placeholder="Ikeja" autoComplete="address-level2" {...register("city")} {...control} />}
        </FormField>
      </div>

      <FormField label="About your shop" optional error={errors.bio?.message}>
        {(control) => (
          <>
            <Textarea
              maxLength={BIO_MAX}
              placeholder="What do you sell? Tell buyers a little about you."
              {...register("bio")}
              {...control}
            />
            <p className="text-right text-xs text-muted-foreground" aria-hidden>
              {bioLength} / {BIO_MAX}
            </p>
          </>
        )}
      </FormField>

      {/* Stays busy after success too, until the dashboard opens, so nothing is submitted twice. */}
      <Button type="submit" size="lg" className="w-full" loading={create.isPending || create.isSuccess}>
        Open my shop
      </Button>
    </form>
  );
}