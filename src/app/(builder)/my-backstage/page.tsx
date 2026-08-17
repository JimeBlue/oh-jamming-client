import type { Metadata } from 'next';

import BackstageBoard from '@/components/backstage/BackstageBoard';

export const metadata: Metadata = {
  title: 'My Backstage · Oh Jamming',
};

/* In `(builder)` rather than `(site)`, and the header is the whole reason. A
   child layout can't switch off one its parent rendered, so wearing
   JamBuilderHeader means living under the layout that renders it — which also
   brings the `RequireRole role="venue"` guard and the `<main>` this page used to
   carry itself.

   A server component around a client one: `metadata` is a server export, and the
   board can't be anything but client — the session is an httpOnly cookie on the
   API's domain, so nothing rendered here can read it and every request for a
   venue's own sessions has to happen in the browser.

   No top padding, unlike under `(site)`: the builder header sits in the flow
   rather than fixed over a hero video, so there is nothing to clear.

   The pale-blue ground is the same one /my-bookings sits on — the two boards are
   the same page seen from either side of a booking, and the white cards on both
   need something to sit against. The viewport minus the header rather than
   `min-h-screen`, which would overshoot by the bar's own height, or `min-h-full`,
   which resolves to nothing — the layout's <main> is a flex child with no
   definite height for a percentage to be a percentage of. 5rem is the bar's
   `h-20`; the two move together. */
export default function MyBackstagePage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-pale-blue">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <BackstageBoard />
      </div>
    </div>
  );
}
