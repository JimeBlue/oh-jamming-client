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
   rather than fixed over a hero video, so there is nothing to clear. */
export default function MyBackstagePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <BackstageBoard />
    </div>
  );
}
