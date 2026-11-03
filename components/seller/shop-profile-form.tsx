"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { useSellerProfile, useUpdateSellerProfile } from "@/hooks/use-seller";
import { applyApiErrors } from "@/lib/form-errors";
import { NIGERIAN_STATES, isNigerianState } from "@/lib/nigerian-states";
import type { SellerProfile, SellerProfileChanges } from "@/lib/types/seller";
import { PageSkeleton } from "@/components/layout/require-verified-user";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const BIO_MAX = 1000; // the API's limit

// The same rules as opening a shop. The API checks again, and refuses a shop name another shop already has.
const profileSchema = z.object({
  store_name: z.string().trim().min(3, "Your shop name needs at least 3 characters.").max(60, "Your shop name can be 60 characters at most."),
  bio: z.string().trim().max(BIO_MAX, `Please keep it under ${BIO_MAX} characters.`),
  state: z.string().min(1, "Choose your state."),
  city: z.string().trim().min(1, "Enter your city or town.").max(60, "That name is too long."),
});

type ProfileValues = z.infer<typeof profileSchema>;

const FIELDS = ["store_name", "bio", "state", "city"] as const;

function ProfileForm({ profile }: { profile: SellerProfile }) {
  const update = useUpdateSellerProfile();
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [unchanged, setUnchanged] = useState(false);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      store_name: profile.store_name,
      bio: profile.bio ?? "",
      state: profile.state ?? "",
      city: profile.city ?? "",
    },
  });

  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors },
  } = form;

  const bioLength = watch("bio")?.length ?? 0;

  // An older shop may hold a state typed freely before the list existed. Keep it choosable so it does not vanish.
  const oddState = profile.state && !isNigerianState(profile.state) ? profile.state : null;

  const submit = handleSubmit((values) => {
    setFormError(null);
    setSaved(false);
    setUnchanged(false);

    // Only what changed is sent, so nothing else is touched.
    const changes: SellerProfileChanges = {};

    if (values.store_name !== profile.store_name) changes.store_name = values.store_name;
    if (values.state !== (profile.state ?? "")) changes.state = values.state;
    if (values.city !== (profile.city ?? "")) changes.city = values.city;
    if (values.bio !== (profile.bio ?? "")) changes.bio = values.bio;

    if (Object.keys(changes).length === 0) {
      setUnchanged(true);

      return;
    }

    update.mutate(changes, {
      onSuccess: (next) => {
        setSaved(true);
        // What is shown is now exactly what was saved, so "unsaved changes" starts from here.
        reset({ store_name: next.store_name, bio: next.bio ?? "", state: next.state ?? "", city: next.city ?? "" });
      },
      onError: (error) => setFormError(applyApiErrors(error, setError, FIELDS)),
    });
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}
      {saved && <Alert variant="success">Saved. Changes can take up to a minute to show on your public shop page.</Alert>}
      {unchanged && <Alert variant="info">Nothing has changed.</Alert>}

      <FormField label="Shop name" error={errors.store_name?.message} hint="This is the name buyers see. Pick one that is yours.">
        {(control) => <Input maxLength={60} autoComplete="organization" {...register("store_name")} {...control} />}
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="State" error={errors.state?.message}>
          {(control) => (
            <Select autoComplete="address-level1" {...register("state")} {...control}>
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
          {(control) => <Input maxLength={60} autoComplete="address-level2" {...register("city")} {...control} />}
        </FormField>
      </div>

      <FormField label="About your shop" optional error={errors.bio?.message}>
        {(control) => (
          <>
            <Textarea rows={5} maxLength={BIO_MAX} placeholder="What do you sell? Tell buyers a little about you." {...register("bio")} {...control} />
            <p className="text-right text-xs text-muted-foreground" aria-hidden>
              {bioLength} / {BIO_MAX}
            </p>
          </>
        )}
      </FormField>

      <Button type="submit" size="lg" className="w-full sm:w-auto sm:justify-self-start" loading={update.isPending}>
        Save changes
      </Button>
    </form>
  );
}

/** The shop's public details: name, where it is, and the "about" text. Its web address is shown but never changes. */
export function ShopProfileView() {
  const query = useSellerProfile();

  if (query.isPending) return <PageSkeleton label="Loading your shop" />;

  if (query.isError || !query.data) {
    return (
      <Alert variant="error" title="We couldn't load your shop">
        <Button variant="link" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  const profile = query.data;

  return (
    <div className="grid gap-6">
      <section aria-label="Your shop's public page" className="grid gap-3 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid min-w-0 gap-0.5">
            <p className="text-sm font-semibold">Your shop&apos;s address</p>
            <p className="truncate text-sm text-muted-foreground">/sellers/{profile.slug}</p>
          </div>

          <Link href={`/sellers/${profile.slug}`} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ExternalLink aria-hidden />
            View my shop
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          The address never changes, even if you rename your shop, so links people have saved or shared keep working.
        </p>

        <p className="flex items-center gap-2 border-t border-border pt-3 text-sm">
          <ShieldCheck className={profile.is_verified ? "size-4 text-success" : "size-4 text-muted-foreground"} aria-hidden />
          {profile.is_verified ? (
            <span className="font-medium text-success">Verified seller</span>
          ) : (
            <span className="text-muted-foreground">
              Not verified yet.{" "}
              <Link href="/seller/kyc" className="font-semibold text-primary hover:underline">
                Verify your identity
              </Link>{" "}
              to show the &ldquo;Verified seller&rdquo; badge.
            </span>
          )}
        </p>
      </section>

      <section aria-labelledby="details-heading" className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 id="details-heading" className="text-lg font-bold">
          Shop details
        </h2>

        {/* Keyed by the shop's id, so the form starts clean for this shop and keeps what is typed while it loads again. */}
        <ProfileForm key={profile.slug} profile={profile} />
      </section>
    </div>
  );
}