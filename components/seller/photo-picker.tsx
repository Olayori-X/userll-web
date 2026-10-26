"use client";

import { useEffect, useState, type DragEvent } from "react";
import { ImagePlus, Star, X } from "lucide-react";
import { checkPhoto, LISTING_PHOTO_RULES } from "@/lib/images";
import { cn } from "@/lib/utils";

type PhotoPickerProps = {
  /** How many more photos fit. At 0 the picker is switched off. */
  remaining: number;
  /** Gets the pictures that passed the checks, never more than `remaining`. */
  onAdd: (files: File[]) => void;
  disabled?: boolean;
};

/**
 * A place to choose or drop product photos. Each picture is checked in the browser (type, size, and that it is at
 * least 400 × 400 pixels), and the ones that fail are named with a plain reason instead of being quietly dropped.
 * Whoever uses it keeps the list of photos: this only decides which ones are good enough to add.
 */
export function PhotoPicker({ remaining, onAdd, disabled = false }: PhotoPickerProps) {
  const [problems, setProblems] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [dragging, setDragging] = useState(false);

  const off = disabled || remaining <= 0;

  async function take(list: FileList | File[]) {
    const files = Array.from(list);

    if (files.length === 0) return;

    setChecking(true);

    const accepted: File[] = [];
    const found: string[] = [];

    for (const file of files) {
      const reason = await checkPhoto(file, LISTING_PHOTO_RULES);

      if (reason) found.push(`${file.name} ${reason}.`);
      else accepted.push(file);
    }

    if (accepted.length > remaining) {
      found.push(`Only ${remaining} more ${remaining === 1 ? "photo fits" : "photos fit"}, so the last ${accepted.length - remaining} ${accepted.length - remaining === 1 ? "was" : "were"} left out.`);
    }

    setProblems(found);
    setChecking(false);

    if (accepted.length > 0) onAdd(accepted.slice(0, remaining));
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);

    if (!off) void take(event.dataTransfer.files);
  }

  return (
    <div className="grid gap-2">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          if (!off) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
          off ? "cursor-not-allowed border-border bg-muted/50 text-muted-foreground" : "cursor-pointer border-input bg-card hover:border-primary/60",
          dragging && "border-primary bg-accent/40",
        )}
      >
        <input
          type="file"
          accept={LISTING_PHOTO_RULES.types.join(",")}
          multiple
          disabled={off}
          className="sr-only"
          onChange={(event) => {
            void take(event.target.files ?? []);

            event.target.value = ""; // so choosing the same picture again still counts
          }}
        />

        <ImagePlus className="size-7 text-primary" aria-hidden />

        <span className="text-sm font-semibold">
          {remaining <= 0 ? "You've added the most photos" : checking ? "Checking your photos…" : "Add photos"}
        </span>

        <span className="text-xs text-muted-foreground">
          {remaining <= 0
            ? "Remove one to add another."
            : `Choose or drop up to ${remaining} more. ${LISTING_PHOTO_RULES.typeLabel.replace(/^a /, "")}, up to 5 MB each, at least 400 × 400 pixels.`}
        </span>
      </label>

      {problems.length > 0 && (
        <ul role="alert" className="grid gap-1 rounded-lg border border-destructive/20 bg-danger-soft p-3 text-xs font-medium text-destructive">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Thumbnail({ file, cover, onRemove, onMakeCover }: { file: File; cover: boolean; onRemove: () => void; onMakeCover: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const made = URL.createObjectURL(file);

    setUrl(made);

    return () => URL.revokeObjectURL(made);
  }, [file]);

  return (
    <li className="grid gap-1.5">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
        {url && (
          // A picture from the seller's own device cannot go through next/image, which only loads from hosts we list.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Preview of ${file.name}`} className="size-full object-cover" />
        )}

        {cover && (
          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
            Cover
          </span>
        )}

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
          className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm outline-none transition hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {!cover && (
        <button
          type="button"
          onClick={onMakeCover}
          className="inline-flex items-center justify-center gap-1 rounded-md py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <Star className="size-3" aria-hidden />
          Make cover
        </button>
      )}
    </li>
  );
}

type SelectedPhotosProps = {
  files: File[];
  onRemove: (index: number) => void;
  /** Moves that photo to the front. The first photo is the one buyers see first, on cards and in search. */
  onMakeCover: (index: number) => void;
};

/** The pictures chosen so far, as thumbnails. The first one is the cover. */
export function SelectedPhotos({ files, onRemove, onMakeCover }: SelectedPhotosProps) {
  if (files.length === 0) return null;

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {files.map((file, index) => (
        <Thumbnail
          key={`${file.name}-${file.size}-${file.lastModified}`}
          file={file}
          cover={index === 0}
          onRemove={() => onRemove(index)}
          onMakeCover={() => onMakeCover(index)}
        />
      ))}
    </ul>
  );
}