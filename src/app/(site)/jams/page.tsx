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
       A tinted page because the cards are base-100 — on white they would need an
       outline to be cards at all, and the design's are lifted, not drawn. */
    <main className="min-h-screen flex-1 bg-brand-paper px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      {/* Wider than the 7xl the rest of the app caps at, and the grid is the
          reason: four cards inside 80rem leaves each one narrow enough that a
          two-line title is the normal case, while the page carries 18rem of
          empty gutter either side on a laptop. Still capped rather than
          full-bleed — past this the cards stop growing usefully and the row just
          gets harder to read across. */}
      <div className="mx-auto w-full max-w-[110rem]">
        <JamBrowse />
      </div>
    </main>
  );
}
