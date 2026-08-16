'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HiOutlineSparkles } from 'react-icons/hi';
import { IoTicketSharp } from 'react-icons/io5';
import { FaArrowRight, FaRegCalendar, FaRegClock, FaUsers } from 'react-icons/fa6';

import { useAuth } from '@/context/AuthContext';
import { formatListingDate } from '@/lib/jamListing';
import type { JamListingSlot, JamListingView } from '@/lib/jamListing';

/* The second white box, and the step where the booking flow actually starts.

   The session arrives already fetched from `JamDetailView` — one request feeds
   both cards, so the title above and the slots here can't come from two
   different reads. What is still owned here is the choice and the gate.

   The rows are written here rather than through `listing/JamSlotList`, which is
   what the builder's preview draws. The two say the same thing and no longer
   look alike: this is a booking control with the time on the left and what is
   left of the slot on the right, and that is a shape the preview — where nothing
   is bookable and no slot has ever been booked — has no use for. What both
   still read from is `jamSessionToListing`, which is the part that has to
   agree: availability is counted there, off the spots with no booking on them,
   because the model has no counter and a second sum here would be a second
   answer waiting to disagree with the venue's. */

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
     press Next themselves. An id that matches no slot simply highlights
     nothing, which is the right answer for a hand-edited URL. */
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    initialSlotId ?? null,
  );

  /* Where Next goes, and the one place the login gate is decided for this
     flow.

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
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-base-200 pb-6">
        <div className="flex items-start gap-3">
          <IoTicketSharp aria-hidden className="mt-0.5 size-6 shrink-0 text-primary" />
          <div>
            <h2 className="font-display text-xl font-bold">Book your time slot</h2>
            <p className="mt-1 text-sm">
              Choose an available time slot that works best for you.
            </p>
          </div>
        </div>

        {/* The night's own hours, opposite the slots it is divided into. Read
            together they say what the row of times underneath is a slice of. */}
        {/* The block is pushed right, but the two rows inside it are not:
            right-aligning each one separately stacks a short time under a long
            date and leaves the icons on two different columns. `w-fit` is what
            lets the wider row set the edge for both. */}
        <dl className="w-fit space-y-1 text-sm sm:ml-auto">
          <div className="flex items-center gap-2">
            <FaRegCalendar aria-hidden className="size-4 shrink-0 text-primary" />
            <dt className="sr-only">Date</dt>
            <dd>{formatListingDate(listing.date) ?? 'Date to be confirmed'}</dd>
          </div>
          <div className="flex items-center gap-2">
            <FaRegClock aria-hidden className="size-4 shrink-0 text-primary" />
            <dt className="sr-only">Runs</dt>
            <dd className="tabular-nums">
              {listing.startTime} – {listing.endTime}
            </dd>
          </div>
        </dl>
      </div>

      {cancelled ? (
        /* No slot list at all rather than a disabled one. Every row would say
           "Booked out", which is a different thing from the night being off and
           reads like the jam sold out. */
        <p className="mt-6 text-sm font-bold text-brand-pink-deep">
          This jam session has been cancelled.
        </p>
      ) : (
        <>
          {/* Column headings for the rows below, which is why they are laid out
              on the same two ends the rows are. */}
          <div className="mt-6 flex items-center justify-between gap-4 text-sm font-bold text-primary">
            <span className="flex items-center gap-2">
              <FaRegClock aria-hidden className="size-4" />
              Available time slots
            </span>
            <span className="flex items-center gap-2">
              <FaUsers aria-hidden className="size-4" />
              Spots left
            </span>
          </div>

          <SlotRows
            slots={listing.slots}
            selectedSlotId={selectedSlotId}
            onSelect={setSelectedSlotId}
          />

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="flex items-center gap-2 text-sm">
              <HiOutlineSparkles aria-hidden className="size-5 text-brand-pink-deep" />
              Spots are limited – secure yours now!
            </p>

            {/* Disabled until a slot is picked, because there is nothing to
                continue to — the booking route sends anyone arriving without a
                slot straight back here. Also while `/auth/me` is still out: the
                branch above depends on the answer, and guessing sends half of
                them to the wrong page.

                Disabled by attribute rather than by a class: the attribute is
                what takes it out of the tab order and stops the click, and
                daisyUI dims it either way. */}
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

/* One control per slot: the time on the left, what is left of the slot on the
   right, both inside the one box a musician presses.

   Every row is the same colour whatever its count. A slot down to its last spots
   is the one a musician is most likely to lose, and painting it a warning colour
   would push them at it — a nudge the venue didn't ask for and the page has no
   business making. The number says it plainly enough. */
const SlotRows = ({
  slots,
  selectedSlotId,
  onSelect,
}: {
  slots: readonly JamListingSlot[];
  selectedSlotId: string | null;
  onSelect: (slotId: string) => void;
}) => {
  if (slots.length === 0) {
    return (
      <p className="mt-4 text-sm">
        Slots appear once the session has a start time, an end time and a slot
        length.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2.5">
      {slots.map((slot) => {
        const isSelected = slot.id === selectedSlotId;
        const isFull = slot.spotsFree === 0 && slot.spotsTotal > 0;

        return (
          <li key={slot.id}>
            <button
              type="button"
              onClick={() => onSelect(slot.id)}
              /* A full slot is still worth showing — it tells a musician the
                 night is busy — but there is nothing behind it. */
              disabled={isFull}
              aria-pressed={isSelected}
              className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded-box border px-5 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? 'border-primary bg-primary text-primary-content'
                  : 'border-base-300 bg-base-100 hover:border-primary'
              }`}
            >
              <span className="font-bold tabular-nums">
                {slot.startTime} – {slot.endTime}
              </span>

              {/* Grey until the row is chosen, so the indigo in this list means
                  one thing only: this is the slot you picked. A colour on the
                  alpha rather than on the element — `opacity` would soften the
                  glyphs as well as lighten them. */}
              <span
                className={`text-sm font-bold ${
                  isSelected ? '' : 'text-base-content/60'
                }`}
              >
                {availability(slot)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

/* A count, except when there is nothing to count. "0 spots" is a number a
   musician has to do arithmetic on to reach "I can't have this one". */
const availability = ({ spotsFree, spotsTotal }: JamListingSlot): string => {
  if (spotsTotal === 0) return 'No spots';
  if (spotsFree === 0) return 'Booked out';

  return `${spotsFree} spots`;
};
