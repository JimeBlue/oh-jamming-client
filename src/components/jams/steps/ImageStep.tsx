'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { FaRegImage, FaTrashCan } from 'react-icons/fa6';

import { useJamImage } from '@/context/JamImageContext';
import { MAX_IMAGE_MB, imageFileProblem } from '@/services/uploads';
import JamField from './JamField';

/* Step one: pick a photo of the room.

   Nothing is uploaded here. The file is held in this tab — see JamImageContext
   for why it can't live in the form — and goes to the API once, as part of
   publishing. A venue who tries four photos before settling sends one.

   What the frame shows is therefore a blob: URL, the browser reading the file
   off the disk it already came from. It costs no network and it is the same
   bytes the API will get, which is what makes it a preview rather than a
   promise. */
export default function ImageStep() {
  const { previewUrl, setImage, clearImage } = useJamImage();

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  /* dragenter and dragleave fire again for every child element the pointer
     crosses, so a plain boolean flickers off the moment the file passes over the
     icon inside the frame. Counting the pairs is what makes "still inside"
     answerable — the highlight only drops when the count returns to zero. */
  const dragDepth = useRef(0);

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
       someone does after being told the file was too big. */
    if (inputRef.current) inputRef.current.value = '';
  };

  const pick = (file: File | undefined) => {
    clearInput();

    if (!file) return;

    /* Type and size are knowable from the File alone, and now they are the only
       check that happens before publishing — so getting them right here is what
       stops a venue filling in seven more steps and being told about the photo
       at the very end. The API checks both again on the way in. */
    const problem = imageFileProblem(file);

    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setImage(file);
  };

  const remove = () => {
    clearInput();
    setError(null);
    clearImage();
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

      pick(event.dataTransfer.files[0]);
    },
  };

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
            previewUrl ? 'aspect-video' : ''
          } ${isDragging ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-200/60'}`}
        >
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="The photo musicians will see on your session"
              fill
              /* Always: a blob: URL has no server to optimise it, and next/image
                 would be asking its own endpoint to fetch a URL that exists only
                 in this tab. The resizing the API does on upload is what keeps
                 the published one small. */
              unoptimized
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
          {!previewUrl && (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={(event) => pick(event.target.files?.[0])}
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

        </div>
      </JamField>

      {previewUrl && (
        <button type="button" onClick={remove} className="btn btn-outline btn-sm gap-2">
          <FaTrashCan className="size-4" />
          Remove photo
        </button>
      )}
    </div>
  );
}
