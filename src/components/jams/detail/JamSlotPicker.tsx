'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IoTicketSharp } from 'react-icons/io5';
import { FaArrowRight, FaRegCalendar, FaRegClock } from 'react-icons/fa6';

import { useAuth } from '@/context/AuthContext';
import { formatListingDate } from '@/lib/jamListing';
import type { JamListingSlot, JamListingView } from '@/lib/jamListing';

/* The cyan box, and the step where the booking flow actually starts.

   The session arrives already fetched from `JamDetailView` — one request feeds
   this and the blocks above, so the name up there and the times down here can't
   come from two different reads. What is still owned here is the choice and the
   gate.

   The slots are a grid of tiles rather than a list of rows. Eight quarter-hours
   read as a clock face laid out that way — you scan for the one you can make
   rather than reading down twelve lines — and it is the shape that lets the
   count sit *under* each time instead of at the far end of a row from it. Which
   is also why this is still written here and not through
   `listing/JamSlotList`: that one is the builder's preview, where nothing is
   bookable and no slot has ever been booked, so it has no selected state, no
   full state and nothing to count.

   What both read from is `jamSessionToListing`, which is the part that has to
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
     them. A tile that navigated on click would leave a musician on the next page
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

  const openSlots = listing.slots.filter(({ spotsFree }) => spotsFree > 0).length;

  return (
    <section className="flex flex-col gap-8 rounded-box bg-cyan-blue p-6 text-white shadow-lg sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-3.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <IoTicketSharp aria-hidden className="size-7 shrink-0" />
            Book your time slot
          </h2>
          <p className="text-white/90 sm:text-lg">
            Choose an available time slot that works best for you.
          </p>
        </div>

        {/* The night's own hours, opposite the slots it is divided into. Read
            together they say what the grid underneath is a slice of. */}
        <dl className="flex w-fit flex-col gap-2.5 sm:ml-auto">
          <div className="flex items-center gap-2.5">
            <FaRegCalendar aria-hidden className="size-5 shrink-0" />
            <dt className="sr-only">Date</dt>
            <dd className="font-display font-bold sm:text-lg">
              {formatListingDate(listing.date) ?? 'Date to be confirmed'}
            </dd>
          </div>
          <div className="flex items-center gap-2.5">
            <FaRegClock aria-hidden className="size-5 shrink-0" />
            <dt className="sr-only">Runs</dt>
            <dd className="font-display font-bold tabular-nums sm:text-lg">
              {listing.startTime} – {listing.endTime}
            </dd>
          </div>
        </dl>
      </div>

      {cancelled ? (
        /* No slot grid at all rather than a disabled one. Every tile would say
           "Full", which is a different thing from the night being off and reads
           like the jam sold out.

           White on the cyan rather than the pink the rest of the app uses for
           this: pink on cyan is the one pairing in the palette that vibrates. */
        <p className="rounded-box bg-white/15 p-5 font-display font-bold">
          This jam session has been cancelled.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="flex items-center gap-2.5 font-display text-xs font-bold uppercase tracking-widest text-dark-teal">
                <FaRegClock aria-hidden className="size-4" />
                Time slots
              </h3>

              {listing.slots.length > 0 && (
                <p className="flex items-center gap-2 text-sm text-white/90">
                  <span aria-hidden className="size-2 rounded-full bg-dark-teal" />
                  {openSlots} of {listing.slots.length} slots available
                </p>
              )}
            </div>

            <SlotGrid
              slots={listing.slots}
              selectedSlotId={selectedSlotId}
              onSelect={setSelectedSlotId}
            />
          </div>

          {/* The choice is not written out again here. The grid says it in
              colour a few centimetres up, and a second statement of the same
              fact was the thing you read instead of the tiles. */}
          <div className="flex justify-end border-t border-white/20 pt-7">
            {/* Disabled until a slot is picked, because there is nothing to
                continue to — the booking route sends anyone arriving without a
                slot straight back here. Also while `/auth/me` is still out: the
                branch above depends on the answer, and guessing sends half of
                them to the wrong page.

                Disabled by attribute rather than by a class: the attribute is
                what takes it out of the tab order and stops the click. The
                styling is written out instead of using `btn-primary` because
                daisyUI's disabled treatment is a grey fill, which on this cyan
                reads as a hole in the card rather than as a button waiting. */}
            <button
              type="button"
              disabled={selectedSlotId === null || authStatus === 'loading'}
              onClick={() => continueToBooking(selectedSlotId ?? '')}
              className="btn h-12 w-full border-none bg-royal-blue px-10 font-display text-base font-bold text-white hover:bg-royal-blue/90 disabled:bg-dark-teal/25 disabled:text-white/60 sm:w-auto"
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

/* One tile per slot: the time, and under it what is left of that time.

   `auto-fill` rather than a fixed column count, so a two-hour night in
   quarter-hours and a two-hour night in halves both come out as full rows
   instead of one of them leaving half the card empty. */
const SlotGrid = ({
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
      <p className="text-white/90">
        Slots appear once the session has a start time, an end time and a slot
        length.
      </p>
    );
  }

  return (
    /* 8.5rem, not 9: at 9rem two tiles plus the gap come to 300px inside the
       295px a 375px phone leaves after the card's padding, and `auto-fill`
       answers by dropping to a single column — eight full-width bars where the
       point of the grid was that a night's worth of times fits on one screen. */
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))]">
      {slots.map((slot) => {
        const isSelected = slot.id === selectedSlotId;
        const isFull = slot.spotsFree === 0;

        return (
          <li key={slot.id}>
            {/* Every tile is the same colour whatever its count. A slot down to
                its last spot is the one a musician is most likely to lose, and
                painting it a warning colour would push them at it — a nudge the
                venue didn't ask for and the page has no business making. The
                number says it plainly enough.

                No outline in any state. Selection is the whole tile going
                indigo, which on this cyan is already the loudest thing in the
                grid — a border on top of it was drawing a line around something
                nobody could miss. */}
            <button
              type="button"
              onClick={() => onSelect(slot.id)}
              /* A full slot is still worth showing — it tells a musician the
                 night is busy — but there is nothing behind it. */
              disabled={isFull}
              aria-pressed={isSelected}
              className={`flex w-full cursor-pointer flex-col gap-1 rounded-box px-3 py-4 text-left sm:px-4 transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 ${
                isSelected ? 'bg-royal-blue text-white' : 'bg-pale-blue text-dark-teal'
              }`}
            >
              {/* `nowrap` and the narrow padding above are one decision: two
                  tiles per row on a 375px phone leaves about 110px of content
                  width, and "20:00 – 22:00" set at 16px is a hair over that —
                  it broke after the dash, which turns a time range into two
                  times. */}
              <span className="whitespace-nowrap font-display font-bold tabular-nums sm:text-lg">
                {slot.startTime} – {slot.endTime}
              </span>
              <span className="text-sm opacity-75">{availability(slot)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

/* A count, except when there is nothing to count. "0 spots left" is a number a
   musician has to do arithmetic on to reach "I can't have this one". */
const availability = ({ spotsFree, spotsTotal }: JamListingSlot): string => {
  if (spotsTotal === 0) return 'No spots';
  if (spotsFree === 0) return 'Full';

  return `${spotsFree} ${spotsFree === 1 ? 'spot' : 'spots'} left`;
};
