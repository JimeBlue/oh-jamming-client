import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import RequireRole from '@/components/auth/RequireRole';
import BookingSummary from '@/components/jams/booking/BookingSummary';

export const metadata: Metadata = {
  title: 'Booking summary · Oh Jamming',
};

type SummaryPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ slot?: string; spots?: string; band?: string }>;
};

/* Step three, scaffold only — it exists so Next on the instrument step leads
   somewhere instead of 404ing, and so the choice it carries is visible.

   The spots ride in the query string, comma separated. Provisional: it is the
   shape that needs no state shared between two routes, but ten uuids make for a
   long URL, and if the summary ends up needing more of the booking than this it
   should become one route with steps rather than a longer query. */
export default async function BookingSummaryPage({
  params,
  searchParams,
}: SummaryPageProps) {
  const { id } = await params;
  const { slot, spots, band } = await searchParams;

  /* Either half missing means this was reached by hand rather than by the flow.
     Back to the step that produces it, which is where the answer is. */
  if (!slot) redirect(`/jams/${id}`);
  if (!spots) redirect(`/jams/${id}/book?slot=${encodeURIComponent(slot)}`);

  const spotIds = spots.split(',').filter(Boolean);

  /* The instrument step can't produce a one-character name — it disables Next —
     but a hand-edited URL can, and the API's `min(2)` would refuse the whole
     booking. Dropped rather than reported: the field is optional, so "no band
     name" is a valid booking and the honest fallback. */
  const trimmedBand = band?.trim() ?? '';
  const bandName = trimmedBand.length >= 2 ? trimmedBand : '';

  /* Pale blue, matching the step before: the summary draws its own royal-blue
     and cyan blocks now, and a coloured page under them left the white cards
     with nothing to sit against. */
  return (
    <main className="min-h-screen flex-1 bg-pale-blue pt-28">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-20 sm:px-6 lg:px-8">
        <RequireRole role="musician">
          <BookingSummary
            id={id}
            slotId={slot}
            spotIds={spotIds}
            bandName={bandName}
          />
        </RequireRole>
      </div>
    </main>
  );
}
