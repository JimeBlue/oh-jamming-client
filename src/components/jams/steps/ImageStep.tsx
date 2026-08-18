'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { CiImageOn } from 'react-icons/ci';
import { FaTrashCan } from 'react-icons/fa6';

import { useJamImage } from '@/context/JamImageContext';
import { MAX_IMAGE_MB, imageFileProblem } from '@/services/uploads';
import JamField from './JamField';
import JamNote from './JamNote';

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
        /* The formats and the size limit moved into the chips inside the frame,
           where they are read while deciding which file to drag rather than
           after. What's left is the part no chip can carry: what makes a good
           photo, and that skipping this step is a real option — it is the only
           step of the eight that can be left empty, and a venue with no photo to
           hand needs to know that before they go looking for one. */
        hint="A wide shot of the room works better than a poster. You can add this later — sessions without a photo still publish."
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
          } ${isDragging ? 'border-royal-blue bg-royal-blue/10' : 'border-royal-blue/25 bg-pale-blue'}`}
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

              {/* A filled tile rather than a tinted disc: it is the only
                  saturated thing inside a frame that is otherwise a dashed
                  outline on pale blue, which is what makes the empty state read
                  as a target rather than as a gap. */}
              <span className="flex size-14 items-center justify-center rounded-box bg-royal-blue">
                <CiImageOn className="size-7 text-white" />
              </span>

              <span className="space-y-1">
                <span className="block font-bold text-brand-navy">
                  Drag &amp; drop your photo here
                </span>
                <span className="block text-sm text-brand-navy/60">
                  or{' '}
                  <span className="font-bold text-royal-blue underline">
                    click to browse
                  </span>
                </span>
              </span>

              {/* The two facts that decide whether a given file will be
                  accepted, inside the frame the file is about to be dropped on.
                  As chips rather than a sentence because they are read in the
                  half-second before a drag, not during it — and the size is
                  built from `MAX_IMAGE_MB`, which is the same constant the check
                  that rejects the file uses. A third chip, "Landscape works
                  best", was cut: it is advice rather than a rule, and it sits in
                  the hint under the frame with the rest of the advice. */}
              <span className="mt-1 flex flex-wrap justify-center gap-2">
                <span className="rounded-field border border-royal-blue/15 bg-base-100 px-3 py-1 text-xs font-medium text-brand-navy/70">
                  JPEG · PNG · WebP
                </span>
                <span className="rounded-field border border-royal-blue/15 bg-base-100 px-3 py-1 text-xs font-medium text-brand-navy/70">
                  Up to {MAX_IMAGE_MB}MB
                </span>
              </span>
            </label>
          )}

        </div>
      </JamField>

      {previewUrl && (
        <button
          type="button"
          onClick={remove}
          className="btn btn-sm gap-2 border-royal-blue bg-transparent font-bold text-royal-blue shadow-none transition-colors hover:border-royal-blue hover:bg-royal-blue hover:text-white"
        >
          <FaTrashCan className="size-4" />
          Remove photo
        </button>
      )}

      <JamNote>
        This is the first thing musicians see when they browse. Show the stage,
        the backline or the room full of people.
      </JamNote>
    </div>
  );
}
