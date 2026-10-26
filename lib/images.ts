/**
 * Checking a picture in the browser before it is uploaded, so a seller never waits for an upload the API was
 * going to refuse. The API checks again: its limits are server settings, and these are the defaults.
 */

/** The pixel size of a picture, or null if the browser cannot read it. Remembered per file, so each is only read once. */
const sizes = new WeakMap<File, Promise<{ width: number; height: number } | null>>();

export function pictureSize(file: File): Promise<{ width: number; height: number } | null> {
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

export type PhotoRules = {
  /** The file types allowed, as the browser names them: "image/jpeg". */
  types: readonly string[];
  /** For the message: "a JPG or PNG". */
  typeLabel: string;
  maxBytes: number;
  minWidth: number;
  minHeight: number;
};

/** The photo of an ID for the identity check. */
export const ID_PHOTO_RULES: PhotoRules = {
  types: ["image/jpeg", "image/png"],
  typeLabel: "a JPG or PNG",
  maxBytes: 5 * 1024 * 1024,
  minWidth: 400,
  minHeight: 300,
};

/** A photo of something for sale. */
export const LISTING_PHOTO_RULES: PhotoRules = {
  types: ["image/jpeg", "image/png", "image/webp"],
  typeLabel: "a JPG, PNG or WebP",
  maxBytes: 5 * 1024 * 1024,
  minWidth: 400,
  minHeight: 400,
};

/**
 * What is wrong with a picture, as the end of a sentence ("must be a JPG or PNG", "is too big"), or null when it is
 * fine. A caller writes it as `${name} ${reason}.` or `The photo ${reason}.`
 */
export async function checkPhoto(file: File, rules: PhotoRules): Promise<string | null> {
  if (!rules.types.includes(file.type)) return `must be ${rules.typeLabel}`;

  if (file.size > rules.maxBytes) return `is too big (keep it under ${Math.round(rules.maxBytes / (1024 * 1024))} MB)`;

  const size = await pictureSize(file);

  if (size === null) return "couldn't be read, so please try another picture";

  if (size.width < rules.minWidth || size.height < rules.minHeight) {
    return `is too small (use one at least ${rules.minWidth} × ${rules.minHeight} pixels)`;
  }

  return null;
}