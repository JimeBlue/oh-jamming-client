import type { Metadata } from 'next';

import JamWizard from '@/components/jams/JamWizard';

export const metadata: Metadata = {
  title: 'Insert your Jam · Oh Jamming',
};

/* The same pale blue the booking flow sits on, and for the same reason: the
   wizard's card is white and its step bar is drawn on the page itself, both of
   which need a ground that isn't also white. The two forms are the same object
   from either side of a listing — a venue filling one and a musician filling the
   other shouldn't be standing on different floors.

   Viewport minus the header rather than `min-h-screen`, which would overshoot by
   the bar's own height, or `min-h-full`, which resolves to nothing under a
   `<main>` that is a flex child with no definite height. 5rem is the bar's
   `h-20`; the two move together. */
export default function NewJamSessionPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-pale-blue">
      <JamWizard />
    </div>
  );
}
