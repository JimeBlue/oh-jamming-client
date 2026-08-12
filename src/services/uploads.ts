import { z } from 'zod';

import { api } from '@/services/api';

/* File in, URL out. The bytes never touch this app's own server — they go to the
   API, which puts them on Cloudinary and answers with the delivery URL that ends
   up in a jam session's `image`.

   Uploading through the API rather than straight to Cloudinary from the browser
   is what keeps the account's API secret server-side, and what makes the upload
   venue-only and rate-limited like every other write. */

/* Both numbers mirror `parseImageUpload` on the API, and both are enforced there
   too — these exist so a 12MB photo is refused in the file picker instead of
   after twelve megabytes have crossed the network. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_MB = MAX_IMAGE_BYTES / 1024 / 1024;

const uploadResponseSchema = z.object({ url: z.url() });

/* The field name is the contract: the API reads `files.image`, so anything else
   arrives there as no file at all. */
const IMAGE_FIELD = 'image';

export const uploadJamImage = async (file: File): Promise<string> => {
  const body = new FormData();
  body.append(IMAGE_FIELD, file);

  const { url } = await api.upload('/uploads/image', body, uploadResponseSchema);

  return url;
};

/* Returns the reason a file can't be uploaded, or null if it can. Checked before
   the request because the two failures worth catching early — wrong type, too
   big — are both knowable from the File object alone, and finding out after the
   upload is the slowest possible way to learn them. */
export const imageFileProblem = (file: File): string | null => {
  if (!file.type.startsWith('image/')) {
    return 'That file isn’t an image. Pick a JPEG, PNG or WebP.';
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB, and the limit is ${MAX_IMAGE_MB}MB.`;
  }

  return null;
};
