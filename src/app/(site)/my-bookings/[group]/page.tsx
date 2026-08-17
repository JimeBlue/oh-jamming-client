import type { Metadata } from 'next';

import RequireRole from '@/components/auth/RequireRole';
import BookingDetails from '@/components/bookings/BookingDetails';

export const metadata: Metadata = {
  title: 'Booking details · Oh Jamming',
};

/* One booking, keyed by `groupId` — a booking's handle everywhere else in this
   app, and the thing a card in the list already knows.

   A route rather than a modal (decision 11 in `docs/my-bookings.md`): the QR,
   the address, the spots and the actions are a screenful on a phone, and a route
   survives the reload someone standing at a door will do.

   Same server-component shell as the list: `metadata` is a server export, and
   everything below has to fetch from the browser because the session cookie is
   on the API's domain. */
export default async function BookingDetailsPage({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group } = await params;

  return (
    <main className="min-h-screen flex-1 bg-pale-blue pt-28">
      <div className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <RequireRole role="musician">
          <BookingDetails groupId={group} />
        </RequireRole>
      </div>
    </main>
  );
}
