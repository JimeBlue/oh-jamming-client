'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useController } from 'react-hook-form';
import { FaRegImage, FaTrashCan } from 'react-icons/fa6';

import { useJamForm } from '@/hooks/useJamForm';
import { ApiError } from '@/services/api';
import { MAX_IMAGE_MB, imageFileProblem, uploadJamImage } from '@/services/uploads';
import JamField from './JamField';

/* Step one: pick a photo of the room.

   The upload happens the moment a file is chosen, not at publish, and that is
   the decision the rest of this file follows from. The form is mirrored into
   sessionStorage on every change, and a File object cannot survive that trip —
   so what the form holds is the URL the API answered with, which is a string
   like every other field. A venue who picks a photo, reloads, and comes back
   finds it still there.

   It also means an abandoned wizard leaves an unused image in Cloudinary. That
   is the cheaper of the two mistakes: the alternative is holding the file in
   memory for eight steps and discovering the upload fails at the exact moment
   the venue thought they were done. */
export default function ImageStep() {
  const { control } = useJamForm();
  const { field } = useController({ control, name: 'image' });

  /* A blob: URL for the file just picked, shown while the upload is in flight so
     the frame fills instantly instead of sitting empty over a slow connection.
     Dropped on success — from then on the frame shows what the API actually
     stored, which is the only version that proves the upload worked. */
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  /* dragenter and dragleave fire again for every child element the pointer
     crosses, so a plain boolean flickers off the moment the file passes over the
     icon inside the frame. Counting the pairs is what makes "still inside"
     answerable — the highlight only drops when the count returns to zero. */
  const dragDepth = useRef(0);

  /* Every blob: URL pins its file in memory until it is revoked. The cleanup
     runs both on unmount and whenever `preview` changes, which is what stops a
     venue who tries four photos from holding all four. */
  useEffect(() => {
    if (!preview) return;

    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  /* A file dropped anywhere *but* the frame is the browser's to handle, and what
     it does is navigate to it — the wizard replaced by a raw JPEG because
     someone let go two centimetres short. The draft survives in sessionStorage,
     but having to find your way back to step 5 does not feel like it. Swallowing
     the default for the duration of this step is the cheapest fix; the frame's
     own handlers still get their drop, because they run first and this never
     stops propagation. */
  useEffect(() => {
    const swallow = (event: DragEvent) => event.preventDefault();

    window.addEventListener('dragover', swallow);
    window.addEventListener('drop', swallow);

    return () => {
      window.removeEventListener('dragover', swallow);
      window.removeEventListener('drop', swallow);
    };
  }, []);

  const clearInput = () => {
    /* Without this the same file can't be picked twice in a row: the input's
       value doesn't change, so no change event fires — which is exactly what
       someone does after an upload fails. */
    if (inputRef.current) inputRef.current.value = '';
  };

  const pick = async (file: File | undefined) => {
    clearInput();

    if (!file) return;

    /* Type and size are knowable from the File alone, so they're answered here
       rather than after five megabytes have crossed the network. The API checks
       both again — this is a courtesy, not the rule. */
    const problem = imageFileProblem(file);

    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setPreview(URL.createObjectURL(file));
    setIsUploading(true);

    try {
      field.onChange(await uploadJamImage(file));
      setPreview(null);
    } catch (uploadError) {
      setPreview(null);
      setError(uploadFailureMessage(uploadError));
    } finally {
      setIsUploading(false);
    }
  };

  const remove = () => {
    clearInput();
    setPreview(null);
    setError(null);
    field.onChange('');
  };

  const dragHandlers = {
    onDragEnter: (event: React.DragEvent) => {
      event.preventDefault();
      dragDepth.current += 1;
      setIsDragging(true);
    },
    onDragOver: (event: React.DragEvent) => {
      /* Load-bearing: without a preventDefault on *dragover* specifically, the
         drop event never fires and the browser does its own default thing —
         replacing the wizard with the raw image file. */
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave: (event: React.DragEvent) => {
      event.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);

      if (dragDepth.current === 0) setIsDragging(false);
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);

      /* Dropping a second file onto an upload in flight would leave two
         responses racing to set one field. */
      if (isUploading) return;

      void pick(event.dataTransfer.files[0]);
    },
  };

  const source = preview ?? field.value;

  return (
    <div className="space-y-4">
      <JamField
        label="Session photo"
        error={error ?? undefined}
        hint={`Optional. JPEG, PNG or WebP, up to ${MAX_IMAGE_MB}MB — a wide shot of the room works better than a poster.`}
      >
        {/* The drop zone *is* the control — there is no visible file input, and
            no click handler either. The whole zone is a <label> wrapping a
            visually hidden input, so clicking it opens the picker the way a
            label always has, and the input keeps its place in the tab order and
            its "Session photo" name for a screen reader. A styled <div> calling
            input.click() would look identical and be reachable by mouse only. */}
        <div
          {...dragHandlers}
          className={`relative w-full overflow-hidden rounded-box border-2 border-dashed transition-colors focus-within:border-primary ${
            /* Only once there's a photo in it. An empty aspect-video box on a
               desktop card is 600px of dashed nothing, and the shape it would be
               previewing is a shape nobody can judge while it's empty. */
            source ? 'aspect-video' : ''
          } ${isDragging ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-200/60'}`}
        >
          {source ? (
            <Image
              src={source}
              alt="The photo musicians will see on your session"
              fill
              /* A blob: URL has no server to optimise it — next/image would ask
                 its own endpoint to fetch a URL that only exists in this tab. The
                 uploaded one is already capped at 1600px and quality-auto by the
                 API, so this costs nothing either way. */
              unoptimized={Boolean(preview)}
              sizes="(min-width: 640px) 42rem, 100vw"
              className="object-cover"
            />
          ) : null}

          {/* Only while the frame is empty. Once there's a photo the frame shows
              the photo and nothing else — a panel that appears over it on hover
              covers the one thing the venue came to this step to look at, and it
              covers it exactly when they lean in to check it.

              Replacing is therefore "Remove photo, then choose another", which is
              two steps but never hides anything. Dropping a file straight onto an
              existing photo still works — the handlers are on the frame, not on
              this label — it just isn't advertised. */}
          {!source && !isUploading && (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={(event) => void pick(event.target.files?.[0])}
                className="sr-only"
              />

              <span className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <FaRegImage className="size-6 text-primary" />
              </span>

              <span className="space-y-1">
                <span className="block font-bold">Drag &amp; drop your photo here</span>
                <span className="block text-sm opacity-70">
                  or <span className="text-primary underline">click to browse</span>
                </span>
              </span>
            </label>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-base-100/70">
              <span className="loading loading-spinner text-primary" />
              <span className="text-sm font-bold">Uploading…</span>
            </div>
          )}
        </div>
      </JamField>

      {field.value && !isUploading && (
        <button type="button" onClick={remove} className="btn btn-outline btn-sm gap-2">
          <FaTrashCan className="size-4" />
          Remove photo
        </button>
      )}
    </div>
  );
}

/* The 503 is worth its own sentence: it means the server has no image host
   configured, which no amount of picking a different photo will fix, and a venue
   told only "upload failed" would keep trying. */
const uploadFailureMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) {
    return 'That upload didn’t go through. Check your connection and try again.';
  }

  if (error.status === 503) {
    return 'Image upload isn’t available right now — you can publish without a photo and add one later.';
  }

  /* 400, 413 and 429 all arrive with a message written for this screen. */
  return error.message;
};
