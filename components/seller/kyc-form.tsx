"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { z } from "zod";
import { useSubmitKyc } from "@/hooks/use-seller";
import { applyApiErrors } from "@/lib/form-errors";
import type { IdType } from "@/lib/types/seller";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

// The API's rules. They are checked here first so a seller never waits for an upload that was going to be refused.
// The API checks again, and its limit on the photo's size is a server setting (5 MB by default).
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;

/** The pixel size of a picture, or null if the browser cannot read it. Remembered per file, so it is only read once. */
const sizes = new WeakMap<File, Promise<{ width: number; height: number } | null>>();

function pictureSize(file: File) {
  let result = sizes.get(file);

  if (!result) {
    result = createImageBitmap(file)
      .then((bitmap) => {
        const size = { width: bitmap.width, height: bitmap.height };

        bitmap.close();

        return size;
      })
      .catch(() => null);

    sizes.set(file, result);
  }

  return result;
}

const photoSchema = z
  .instanceof(File, { error: "Add a photo of your ID." })
  .refine((file) => ["image/jpeg", "image/png"].includes(file.type), "The photo must be a JPG or PNG.")
  .refine((file) => file.size <= MAX_PHOTO_BYTES, "That photo is too big. Please keep it under 5 MB.")
  .refine(async (file) => (await pictureSize(file)) !== null, "We couldn't read that photo. Please try another one.")
  .refine(async (file) => {
    const size = await pictureSize(file);

    return size === null || (size.width >= MIN_WIDTH && size.height >= MIN_HEIGHT);
  }, `That photo is too small to read. Use one that is at least ${MIN_WIDTH} × ${MIN_HEIGHT} pixels.`);

const kycSchema = z.object({
  legal_name: z.string().trim().min(3, "Enter your full name as it is on your ID.").max(120, "That name is too long."),
  id_type: z.string().min(1, "Choose the kind of ID you're sending."),
  id_photo: photoSchema,
});

type KycValues = z.infer<typeof kycSchema>;

const FIELDS = ["legal_name", "id_type", "id_photo"] as const;

const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 " +
  "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 md:text-sm";

type KycFormProps = {
  idTypes: { value: IdType; label: string }[];
};

export function KycForm({ idTypes }: KycFormProps) {
  const submit = useSubmitKyc();
  const [formError, setFormError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<KycValues>({
    resolver: zodResolver(kycSchema),
    defaultValues: { legal_name: "", id_type: "" },
  });

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = form;

  // A small preview of the chosen photo, so the seller can see it is the right one and readable.
  const photo = watch("id_photo") as File | undefined;

  useEffect(() => {
    if (!photo) {
      setPreviewUrl(null);

      return;
    }

    const url = URL.createObjectURL(photo);

    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    submit.mutate(
      { legal_name: values.legal_name, id_type: values.id_type as IdType, id_photo: values.id_photo },
      { onError: (error) => setFormError(applyApiErrors(error, setError, FIELDS)) },
    );
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField
        label="Full legal name"
        error={errors.legal_name?.message}
        hint="Exactly as it is on your ID. It must match the name on your bank account."
      >
        {(control) => <Input autoComplete="name" maxLength={120} placeholder="Ada Chinwe Obi" {...register("legal_name")} {...control} />}
      </FormField>

      <FormField label="Kind of ID" error={errors.id_type?.message}>
        {(control) => (
          <select className={SELECT_CLASS} {...register("id_type")} {...control}>
            <option value="">Choose one</option>
            {idTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField
        label="Photo of your ID"
        error={errors.id_photo?.message}
        hint="A clear photo of the whole ID, in good light, with all the writing readable. JPG or PNG, up to 5 MB."
      >
        {(control) => (
          <Input
            type="file"
            accept="image/jpeg,image/png"
            className="h-auto py-2"
            onChange={(event) => {
              const file = event.target.files?.[0];

              // Choosing nothing (closing the picker) keeps the photo that was already chosen.
              if (file) setValue("id_photo", file, { shouldValidate: true, shouldDirty: true });
            }}
            {...control}
          />
        )}
      </FormField>

      {previewUrl && (
        <div className="grid gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Your photo</p>
          {/* A picture from the seller's own device cannot go through next/image, which only loads from hosts we list. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Preview of the photo you chose" className="max-h-56 w-fit max-w-full rounded-lg border border-border object-contain" />
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Your ID photo is kept private. Only our verification team can see it, and only to check who you are.
      </p>

      <Button type="submit" size="lg" className="w-full sm:w-auto sm:justify-self-start" loading={submit.isPending}>
        Send for review
      </Button>
    </form>
  );
}