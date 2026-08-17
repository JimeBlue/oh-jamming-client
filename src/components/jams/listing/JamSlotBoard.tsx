import { IoTicketSharp } from 'react-icons/io5';
import { FaRegCalendar, FaRegClock } from 'react-icons/fa6';

import { formatListingDate } from '@/lib/jamListing';
import type { JamListingSlot, JamListingView } from '@/lib/jamListing';

/* The cyan box: the night's hours, and the grid of slots it is divided into.

   The slots are tiles rather than rows. Eight quarter-hours read as a clock face
   laid out that way — you scan for the one you can make rather than reading down
   twelve lines — and it is the shape that lets the count sit *under* each time
   instead of at the far end of a row from it.

   Presentation only. The musician's page wraps this in `JamSlotPicker`, which
   owns the selection, the login gate and the Next button; the builder's preview
   and the venue's Listing panel render it with no handler at all. That absence
   is the difference between the two, and it is deliberate that it reads as an
   absence: on the venue's side there is nothing to book — the session may not
   even exist yet — and tiles that highlight under the pointer would be promising
   an action that leads nowhere. Without `onSelect` they are list items rather
   than buttons, which is the same distinction said to a screen reader.

   What every caller reads from is `lib/jamListing`, which is where availability
   is counted — off the spots with no booking on them, because the model has no
   counter and a second sum here would be a second answer waiting to disagree
   with the venue's. */

export default function JamSlotBoard({
  listing,
  title,
  lead,
  cancelled = false,
  selectedSlotId = null,
  onSelect,
  footer,
}: {
  listing: JamListingView;
  title: string;
  lead: string;
  cancelled?: boolean;
  selectedSlotId?: string | null;
  /* Passed only where slots can actually be booked. */
  onSelect?: (slotId: string) => void;
  /* The row under the grid — in practice the Next button, and only on the
     musician's page. Inside the box rather than after it because it acts on
     what is in the box. */
  footer?: React.ReactNode;
}) {
  const openSlots = listing.slots.filter(({ spotsFree }) => spotsFree > 0).length;

  return (
    <section className="flex flex-col gap-8 rounded-box bg-cyan-blue p-6 text-white shadow-lg sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-3.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <IoTicketSharp aria-hidden className="size-7 shrink-0" />
            {title}
          </h2>
          <p className="text-white/90 sm:text-lg">{lead}</p>
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
              onSelect={onSelect}
            />
          </div>

          {/* The choice is not written out again above the footer. The grid says
              it in colour a few centimetres up, and a second statement of the
              same fact was the thing you read instead of the tiles. */}
          {footer && (
            <div className="flex justify-end border-t border-white/20 pt-7">{footer}</div>
          )}
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
  onSelect?: (slotId: string) => void;
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

        /* Every tile is the same colour whatever its count. A slot down to its
           last spot is the one a musician is most likely to lose, and painting
           it a warning colour would push them at it — a nudge the venue didn't
           ask for and the page has no business making. The number says it
           plainly enough.

           No outline in any state. Selection is the whole tile going indigo,
           which on this cyan is already the loudest thing in the grid — a border
           on top of it was drawing a line around something nobody could miss. */
        const face = `flex w-full flex-col gap-1 rounded-box px-3 py-4 text-left sm:px-4 ${
          isSelected ? 'bg-royal-blue text-white' : 'bg-pale-blue text-dark-teal'
        }`;

        const content = (
          <>
            {/* `nowrap` and the narrow padding above are one decision: two tiles
                per row on a 375px phone leaves about 110px of content width, and
                "20:00 – 22:00" set at 16px is a hair over that — it broke after
                the dash, which turns a time range into two times. */}
            <span className="whitespace-nowrap font-display font-bold tabular-nums sm:text-lg">
              {slot.startTime} – {slot.endTime}
            </span>
            <span className="text-sm opacity-75">{availability(slot)}</span>
          </>
        );

        return (
          <li key={slot.id}>
            {onSelect ? (
              <button
                type="button"
                /* The listing renders inside the builder's <form>, where a
                   button without this would submit it. There is no handler
                   there, so this branch never runs in the builder — but the
                   component shouldn't depend on which caller it has. */
                onClick={() => onSelect(slot.id)}
                /* A full slot is still worth showing — it tells a musician the
                   night is busy — but there is nothing behind it. */
                disabled={isFull}
                aria-pressed={isSelected}
                className={`${face} cursor-pointer transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {content}
              </button>
            ) : (
              /* Dimmed the same amount a disabled tile is, because it is the
                 same fact — this time is gone — and the venue checking their
                 listing should see the board a musician sees. */
              <div className={`${face} ${isFull ? 'opacity-40' : ''}`}>{content}</div>
            )}
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
