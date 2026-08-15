import type { Metadata } from 'next';

import JamBrowse from '@/components/jams/browse/JamBrowse';

export const metadata: Metadata = {
  title: 'All jams · Oh Jamming',
  description:
    'Every published jam session still to come — find a night, pick a slot, bring your instrument.',
};

/* The musician's side of the app, and the only page both nav CTAs point at.

   In `(site)` while `/jams/new` sits in `(builder)`, which is not a conflict:
   route groups only collide when two of them produce the *same* URL, and these
   are two different ones. It is the point of the split — this page wears the
   public header, the builder wears its own and the venue-only guard with it.

   A server component wrapping a client one, same as `/my-backstage`: `metadata`
   is a server export, and the list has to be client-side because the filter bar
   it is about to grow re-runs the request on every change. */
export default function JamsPage() {
  return (
    /* pt-28 clears the fixed header, which overlays every page under `(site)`.
       base-200 because the cards are base-100 — on white they would need an
       outline to be cards at all, and the design's are lifted, not drawn. */
    <main className="min-h-screen flex-1 bg-base-200 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <JamBrowse />
      </div>
    </main>
  );
}
