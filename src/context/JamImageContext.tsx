'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/* The photo the venue picked, held in this tab until they publish.

   It is deliberately *not* in the react-hook-form values, and that is the whole
   reason this exists. The wizard mirrors the form into sessionStorage on every
   keystroke, and a File does not survive `JSON.stringify` — it comes back as
   `{}`, which the draft schema rejects, which would throw away the entire draft
   on the next reload rather than just the photo. Anything that cannot be written
   as JSON has to live somewhere the draft never sees.

   The consequence is honest and worth knowing: a picked photo is lost on reload
   while everything else is kept. The alternative — uploading the moment the file
   is picked — keeps it across reloads but leaves an image in Cloudinary for every
   photo a venue tries and rejects, since nothing ever goes back to delete them.
   One unused asset per abandoned wizard was judged the worse of the two.

   (If reload-survival is ever wanted back, the File can go in IndexedDB, which
   stores Blobs as themselves. That is a different lifetime from sessionStorage —
   origin-wide and persistent — so it would need its own cleanup.) */

type JamImage = {
  /* Uploaded by `JamWizard` on publish, and nowhere else. */
  file: File | null;
  /* A blob: URL for `file`, so the step and the preview can both draw it without
     anything having reached a server. Null when there's no photo. */
  previewUrl: string | null;
  setImage: (file: File) => void;
  clearImage: () => void;
};

const JamImageContext = createContext<JamImage | null>(null);

export function JamImageProvider({ children }: { children: React.ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /* Every blob: URL pins its file in memory until revoked. Kept in a ref rather
     than read off state inside the cleanup, so replacing a photo four times in a
     row doesn't leave the first three pinned for the life of the tab. */
  const previousUrl = useRef<string | null>(null);

  const replaceUrl = useCallback((next: string | null) => {
    if (previousUrl.current) URL.revokeObjectURL(previousUrl.current);

    previousUrl.current = next;
    setPreviewUrl(next);
  }, []);

  const setImage = useCallback(
    (picked: File) => {
      setFile(picked);
      replaceUrl(URL.createObjectURL(picked));
    },
    [replaceUrl],
  );

  const clearImage = useCallback(() => {
    setFile(null);
    replaceUrl(null);
  }, [replaceUrl]);

  /* Leaving the builder — published, navigated away, or the tab closing on a
     half-filled form — is the last chance to let the file go. */
  useEffect(
    () => () => {
      if (previousUrl.current) URL.revokeObjectURL(previousUrl.current);
    },
    [],
  );

  return (
    <JamImageContext.Provider value={{ file, previewUrl, setImage, clearImage }}>
      {children}
    </JamImageContext.Provider>
  );
}

export function useJamImage(): JamImage {
  const context = useContext(JamImageContext);

  /* Throwing rather than returning a null-shaped default: a step rendered
     outside the provider would otherwise silently never keep a photo, and the
     bug would only show up as a published session with no image. */
  if (!context) {
    throw new Error('useJamImage must be used inside a JamImageProvider');
  }

  return context;
}
