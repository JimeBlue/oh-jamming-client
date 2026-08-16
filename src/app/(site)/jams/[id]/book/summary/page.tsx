import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import RequireRole from '@/components/auth/RequireRole';
import BookingSummary from '@/components/jams/booking/BookingSummary';

export const metadata: Metadata = {
  title: 'Booking summary · Oh Jamming',
};

type SummaryPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ slot?: string; spots?: string }>;
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
  const { slot, spots } = await searchParams;

  /* Either half missing means this was reached by hand rather than by the flow.
     Back to the step that produces it, which is where the answer is. */
  if (!slot) redirect(`/jams/${id}`);
  if (!spots) redirect(`/jams/${id}/book?slot=${encodeURIComponent(slot)}`);

  const spotIds = spots.split(',').filter(Boolean);

  return (
    <main className="min-h-screen flex-1 bg-primary pt-28">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-20 sm:px-6 lg:px-8">
        <RequireRole role="musician">
          <BookingSummary id={id} slotId={slot} spotIds={spotIds} />
        </RequireRole>
      </div>
    </main>
  );
}
