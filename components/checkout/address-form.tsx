"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { applyApiErrors } from "@/lib/form-errors";
import { NIGERIAN_STATES, isNigerianState } from "@/lib/nigerian-states";
import type { Address, NewAddress } from "@/lib/types/checkout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

// These mirror the API's own rules, so problems show before anything is sent. The API still checks again.
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const normalizePhone = (value: string) => value.replace(/[\s\-()]/g, "");

const addressSchema = z.object({
  label: z.string().trim().max(50, "Keep the label to 50 characters."),
  recipient_name: z.string().trim().min(1, "Enter the name of the person receiving it.").max(100, "That name is too long."),
  phone: z
    .string()
    .trim()
    .min(1, "Enter a phone number for the delivery.")
    .refine((value) => PHONE_PATTERN.test(normalizePhone(value)), "Enter a valid phone number, for example 08012345678."),
  street: z.string().trim().min(1, "Enter the street address.").max(200, "That address is too long."),
  city: z.string().trim().min(1, "Enter the city or town.").max(60, "That name is too long."),
  state: z.string().min(1, "Choose a state."),
  is_default: z.boolean(),
});

type AddressValues = z.infer<typeof addressSchema>;

const FIELDS = ["label", "recipient_name", "phone", "street", "city", "state", "is_default"] as const;

const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 " +
  "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 md:text-sm";

type AddressFormProps = {
  /** Fills the form in for editing. Leave it out for a new address. */
  address?: Address;
  /** A person's first address becomes their default automatically, so there is nothing to choose. */
  hideDefaultOption?: boolean;
  submitLabel?: string;
  /** Saves it. If this throws the API's error, the form shows it under the right field. */
  onSubmit: (values: NewAddress) => Promise<unknown>;
  onCancel?: () => void;
};

export function AddressForm({ address, hideDefaultOption = false, submitLabel = "Save address", onSubmit, onCancel }: AddressFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: address?.label ?? "",
      recipient_name: address?.recipient_name ?? "",
      phone: address?.phone ?? "",
      street: address?.street ?? "",
      city: address?.city ?? "",
      state: address?.state ?? "",
      is_default: address?.is_default ?? false,
    },
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const submit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await onSubmit({
        label: values.label, // empty means "no label": the API turns "" into nothing
        recipient_name: values.recipient_name,
        phone: normalizePhone(values.phone),
        street: values.street,
        city: values.city,
        state: values.state,
        // Nothing to send when the option is hidden, and a first address is the default anyway.
        ...(hideDefaultOption ? {} : { is_default: values.is_default }),
      });
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  });

  // An older address may hold a state typed freely before this list existed. Keep it choosable so it does not vanish.
  const oddState = address?.state && !isNigerianState(address.state) ? address.state : null;
  const alreadyDefault = address?.is_default === true;

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField label="Label" optional error={errors.label?.message} hint="For example Home or Office.">
        {(control) => <Input placeholder="Home" maxLength={50} {...register("label")} {...control} />}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Recipient name" error={errors.recipient_name?.message}>
          {(control) => (
            <Input autoComplete="shipping name" placeholder="Ada Obi" {...register("recipient_name")} {...control} />
          )}
        </FormField>

        <FormField label="Phone number" error={errors.phone?.message}>
          {(control) => (
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="shipping tel"
              placeholder="08012345678"
              {...register("phone")}
              {...control}
            />
          )}
        </FormField>
      </div>

      <FormField label="Street address" error={errors.street?.message}>
        {(control) => (
          <Input
            autoComplete="shipping street-address"
            placeholder="12 Adekunle Fajuyi Street, Ikeja"
            {...register("street")}
            {...control}
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="City or town" error={errors.city?.message}>
          {(control) => (
            <Input autoComplete="shipping address-level2" placeholder="Ikeja" {...register("city")} {...control} />
          )}
        </FormField>

        <FormField label="State" error={errors.state?.message}>
          {(control) => (
            <select autoComplete="shipping address-level1" className={SELECT_CLASS} {...register("state")} {...control}>
              <option value="">Choose a state</option>
              {oddState && <option value={oddState}>{oddState}</option>}
              {NIGERIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          )}
        </FormField>
      </div>

      {!hideDefaultOption && (
        <div className="grid gap-1">
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              disabled={alreadyDefault}
              checked={alreadyDefault ? true : undefined}
              {...register("is_default")}
            />
            Make this my default address
          </label>

          {alreadyDefault && (
            <p className="ml-6.5 text-xs text-muted-foreground">
              To change your default, make another address the default.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2.5 pt-1">
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>

        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}