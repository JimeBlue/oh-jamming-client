import type { Metadata } from 'next';
import { Suspense } from 'react';

import JamBrowse from '@/components/jams/browse/JamBrowse';
import JamCta from '@/components/jams/browse/JamCta';

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
/* No `searchParams` prop any more, and that is the change rather than a tidy-up.
   The filters, the page number and the home page's search sentence all live in
   the query string now, and `JamBrowse` reads them with `useSearchParams` — one
   reader, on the side of the boundary that can also write them. Passing `q` down
   as a prop as well would be a second copy of one of them, arriving a render
   earlier than the rest. */
export default function JamsPage() {
  return (
    /* pt-28 clears the fixed header, which overlays every page under `(site)`.
       A tinted page because the cards are base-100 — on white they would need an
       outline to be cards at all, and the design's are lifted, not drawn.

       The tint is `pale-blue`, the same ground `/my-bookings` sits on: this page
       and that one are the two halves of the musician's side, and the browse is
       where they pick the night the ticket comes from. It replaced
       `brand-paper`, the near-neutral off-white the indigo version used.

       The horizontal padding is on the inner container rather than here, which
       is what lets the band below run edge to edge: it sits outside that
       container and carries its own. */
    <main className="min-h-screen flex-1 bg-pale-blue pt-28">
      {/* max-w-7xl with the same padding steps as the header's own bar, so the
          first card starts where the logo does. */}
      <div className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        {/* The search bar is inside `JamBrowse`, not here, even though it renders
            above the heading. It sets the filters the list is fetched with, so
            the two are one piece of state — split across this boundary it would
            need a third client component wrapping both to hold it, which is the
            same coupling with an extra file in the way. */}
        {/* Required, not defensive: `useSearchParams` in a client component makes
            everything up to the nearest Suspense boundary client-rendered, and
            without one Next refuses to prerender the route at all. With it, the
            header and the band below stay static HTML and only the board waits
            for the URL.

            The fallback is the spinner `JamBrowse` shows while its own first
            request is in flight, so the two read as one state rather than as a
            handoff. */}
        <Suspense
          fallback={
            <div className="flex justify-center py-24">
              <span className="loading loading-spinner loading-lg text-cyan-blue" />
              <span className="sr-only">Loading jam sessions</span>
            </div>
          }
        >
          <JamBrowse />
        </Suspense>
      </div>

      {/* Outside the container on purpose — full-bleed is the whole point of it,
          and it constrains its own contents back to 7xl so the heading inside
          still lines up with the grid above. */}
      <JamCta />
    </main>
  );
}
