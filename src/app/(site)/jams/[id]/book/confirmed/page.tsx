import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import RequireRole from '@/components/auth/RequireRole';
import BookingConfirmed from '@/components/jams/booking/BookingConfirmed';

export const metadata: Metadata = {
  title: 'Booking confirmed · Oh Jamming',
};

type ConfirmedPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ group?: string }>;
};

/* Step four, scaffold only — it exists so a successful booking lands somewhere
   rather than 404ing on the one page a musician reaches after their spots are
   already claimed. The QR code, the thank-you and the links out are next.

   `group` rather than a booking id: one submission writes a row per spot and
   they share a groupId, so that is the handle for "the booking I just made".

   No `?slot=` back-link anywhere on this page, deliberately. The spots are
   claimed by the time anyone gets here, and a Back button pointing at the step
   that claims them would offer to do it again. */
export default async function BookingConfirmedPage({
  params,
  searchParams,
}: ConfirmedPageProps) {
  const { id } = await params;
  const { group } = await searchParams;

  /* Reached by hand rather than by booking. There is nothing to confirm, so back
     to the session. */
  if (!group) redirect(`/jams/${id}`);

  return (
    <main className="min-h-screen flex-1 bg-primary pt-28">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-20 sm:px-6 lg:px-8">
        <RequireRole role="musician">
          <BookingConfirmed id={id} groupId={group} />
        </RequireRole>
      </div>
    </main>
  );
}
