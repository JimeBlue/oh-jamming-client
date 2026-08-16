import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import RequireRole from '@/components/auth/RequireRole';

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
          <section className="rounded-box bg-base-100 p-6 text-base-content shadow-lg sm:p-8">
            <h1 className="font-heading text-2xl">Thank you for your booking!</h1>

            <p className="mt-3 text-sm opacity-80">
              Your spots are claimed. The QR code and your booking details go here.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/jams" className="btn btn-primary font-bold">
                See all jam sessions
              </Link>
              <Link href={`/jams/${id}`} className="btn btn-outline btn-primary font-bold">
                Back to this jam
              </Link>
            </div>
          </section>
        </RequireRole>
      </div>
    </main>
  );
}
