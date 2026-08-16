'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaArrowRight, FaRegCalendar } from 'react-icons/fa6';

import JamSlotList from '@/components/jams/listing/JamSlotList';
import { useAuth } from '@/context/AuthContext';
import { formatListingDate } from '@/lib/jamListing';
import type { JamListingView } from '@/lib/jamListing';

/* The second white box, and the step where the booking flow actually starts.

   The session arrives already fetched from `JamDetailView` — one request feeds
   both cards, so the title above and the slots here can't come from two
   different reads. What is still owned here is the choice and the gate.

   `JamSlotList` is the builder's own component, reused rather than rebuilt, and
   `jamSessionToListing` is the adapter it is fed through in the preview too. The
   availability on each row is counted there, off the spots with no booking on
   them — the model has no counter, so a second sum here would be a second answer
   waiting to disagree with the venue's. */

export default function JamSlotPicker({
  id,
  listing,
  cancelled,
  initialSlotId,
}: {
  id: string;
  listing: JamListingView;
  cancelled: boolean;
  initialSlotId?: string;
}) {
  const router = useRouter();
  const { status: authStatus } = useAuth();

  /* Picking and continuing are two acts, and the button below is what separates
     them. A row that navigated on click would leave a musician on the next page
     with no way to see which slot they chose or to change their mind short of
     going back.

     Seeded from `?slot=` so a musician returning from the login gate finds their
     choice already made — they left this page mid-decision, and the point of
     sending them back here rather than onward is that they get to see it and
     press Next themselves. An id that matches no slot simply highlights nothing,
     which is the right answer for a hand-edited URL. */
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    initialSlotId ?? null,
  );

  /* Where Next goes, and the one place the login gate is decided for this flow.

     An anonymous musician is sent to /login with *this* page as the destination,
     slot and all — not the booking page. Landing back here is the whole point:
     they picked a time, got interrupted by a sign-in they didn't ask for, and
     the honest way to resume is to show them the choice they made and let them
     press Next themselves.

     `RequireRole` still guards the booking route, and still redirects to it
     rather than here. That is not the same check said twice: it catches someone
     opening /jams/x/book directly, where this page was never involved and there
     is nothing to come back to. */
  const continueToBooking = (slotId: string) => {
    const booking = `/jams/${id}/book?slot=${encodeURIComponent(slotId)}`;

    if (authStatus === 'anonymous') {
      const back = `/jams/${id}?slot=${encodeURIComponent(slotId)}`;

      router.push(`/login?next=${encodeURIComponent(back)}`);
      return;
    }

    router.push(booking);
  };

  return (
    <section className="rounded-box bg-base-100 p-6 text-base-content shadow-lg sm:p-8">
      <h2 className="flex items-center gap-2 font-heading text-2xl">
        <FaRegCalendar aria-hidden className="size-5 text-brand-pink-deep" />
        Date &amp; time
      </h2>

      <p className="mt-4 text-sm">
        {formatListingDate(listing.date) ?? 'Date to be confirmed'}
        <span className="block tabular-nums">
          {listing.startTime} – {listing.endTime}
        </span>
      </p>

      {cancelled ? (
        /* No slot list at all rather than a disabled one. Every row would say
           "Booked out", which is a different thing from the night being off and
           reads like the jam sold out. */
        <p className="mt-4 text-sm font-bold text-brand-pink-deep">
          This jam session has been cancelled.
        </p>
      ) : (
        <>
          <p className="mt-4 mb-3 text-sm font-bold">
            Select a time slot to book a spot
          </p>

          <JamSlotList
            slots={listing.slots}
            selectedSlotId={selectedSlotId}
            onSelect={setSelectedSlotId}
          />

          {/* Disabled until a slot is picked, because there is nothing to
              continue to — the booking route sends anyone arriving without a
              slot straight back here. Also while `/auth/me` is still out: the
              branch above depends on the answer, and guessing sends half of them
              to the wrong page.

              Disabled by attribute rather than by a class: the attribute is what
              takes it out of the tab order and stops the click, and daisyUI dims
              it either way. */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={selectedSlotId === null || authStatus === 'loading'}
              onClick={() => continueToBooking(selectedSlotId ?? '')}
              className="btn btn-primary font-bold"
            >
              Next
              <FaArrowRight aria-hidden className="size-4" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
