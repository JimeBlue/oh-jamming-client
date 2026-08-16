import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import RequireRole from '@/components/auth/RequireRole';
import InstrumentPicker from '@/components/jams/booking/InstrumentPicker';

export const metadata: Metadata = {
  title: 'Book a spot · Oh Jamming',
};

type BookPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ slot?: string; spots?: string }>;
};

/* The booking flow's instrument step.

   Both choices are in the URL rather than in state, and that is the whole reason
   this is a route at all: a musician who isn't signed in gets sent to /login from
   here, and `?next=` can only carry a URL. State would not survive that trip, and
   neither would a refresh, a shared link, or the browser's own back button —
   which is what `?spots=` is for. Coming back from the summary has to show the
   instruments already picked, whichever way back a musician takes.

   `RequireRole` is the only gate in the flow. It sends an anonymous visitor to
   the login page with this exact URL — query string included — and shows a venue
   an explanation rather than a 404: they aren't lost, they're holding the wrong
   kind of account. It is UX, not security; `POST /bookings` enforces the role
   itself. */
export default async function BookPage({ params, searchParams }: BookPageProps) {
  const { id } = await params;
  const { slot, spots } = await searchParams;

  /* Nothing to book without one, and this is reachable by hand. Back to the
     session rather than an error: the slot list is the thing they need, and it
     is one page away. */
  if (!slot) redirect(`/jams/${id}`);

  return (
    <main className="min-h-screen flex-1 bg-primary pt-28">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-20 sm:px-6 lg:px-8">
        <RequireRole role="musician">
          <InstrumentPicker
            id={id}
            slotId={slot}
            initialSpotIds={spots?.split(',').filter(Boolean) ?? []}
          />
        </RequireRole>
      </div>
    </main>
  );
}
