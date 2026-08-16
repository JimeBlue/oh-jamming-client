import type { IconType } from 'react-icons/lib';
import { FaCircleCheck, FaCircleXmark, FaRegClock } from 'react-icons/fa6';

import type { BookingCardStatus, BookingCardView } from '@/lib/myBookings';

/* One booking, drawn as a ticket: a coloured stub carrying the details and a
   white one carrying the date, the way a paper ticket puts the date where a
   thumb can find it in a pocket.

   Nothing on it is clickable yet. The whole card becomes a link to
   `/my-bookings/[group]` — that is where Cancel, Change and the QR live, and
   deliberately not here (see `docs/my-bookings.md`, decision 9). */

const STATUS: Record<
  BookingCardStatus,
  { label: string; icon: IconType; className: string }
> = {
  /* The badge is now the *only* thing carrying status — the card's colour says
     nothing about it (see below) — so each one has to be legible on either
     surface rather than relying on the one it usually lands on. Emerald and the
     cancelled red both are; "Past" is drawn out of whatever it sits on. */
  confirmed: {
    label: 'Confirmed',
    icon: FaCircleCheck,
    className: 'bg-emerald-green text-white',
  },
  past: {
    label: 'Past',
    icon: FaRegClock,
    className: 'bg-white/25 text-white',
  },
  cancelled: {
    label: 'Cancelled',
    icon: FaCircleXmark,
    /* The app's cancelled red, already used on the venue's board. A booking that
       was called off should look the same to both sides of it. */
    className: 'bg-status-cancelled text-white',
  },
};

/* Cyan on the first card and every third one after it — 1, 4, 7 — with royal
   blue on the two in between.

   Colour is a property of the *position*, not of the booking. It was the status
   at first, and that read as meaning: two cancelled bookings in a row became one
   long blue block, and a musician with nothing but past nights got a page with
   no cyan on it at all. As a rhythm it does the job colour is actually good at
   here — separating one ticket from the next — and leaves saying what a booking
   *is* to the badge, which says it in words. */
const isCyan = (index: number): boolean => index % 3 === 0;

/* The label above every value on the coloured stub. Small, and held back from
   white so the value it names is the thing that is read first. */
const Field = ({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) => (
  /* `min-w-0` because a grid item's default `min-width: auto` refuses to shrink
     below its content — which on a phone let the spot chips run past the edge of
     the card instead of wrapping inside it. */
  <div className={`min-w-0 ${className}`}>
    <p className="text-xs text-white/70">{label}</p>
    <div className="mt-1">{children}</div>
  </div>
);

export default function BookingCard({
  booking,
  /* Where this card sits in the list, which is the only thing its colour depends
     on. Passed in rather than worked out here: a card cannot see the list it is
     in, and giving it the whole list so it could count itself would be a much
     larger prop for a smaller answer. */
  index,
}: {
  booking: BookingCardView;
  index: number;
}) {
  const status = STATUS[booking.status];
  const StatusIcon = status.icon;
  const cyan = isCyan(index);

  return (
    <article
      /* The growth is on the whole ticket, never on the two halves separately —
         transforming them independently would pull the seam apart and leave the
         notches straddling nothing.

         `will-change-transform` is not a performance flourish, it is the fix for
         the date stub juddering. Without a compositor layer of its own the
         browser re-lays out and re-hints the text at every intermediate scale,
         so "AUG" — small, bold, letter-spaced — jumps between subpixel positions
         all the way up. Promoted, it is rasterised once and the texture is
         scaled, which is smooth. The cost is a touch of softness at the top of
         the movement, and a layer per card — affordable here, where the list is
         a musician's own bookings rather than an unbounded feed.

         `transform-gpu` was the first attempt and does not do it: it only adds a
         `translateZ(0)` to the transform chain, which the browser folds back
         into a 2D matrix while the card is at rest, so no layer exists at the
         moment the movement starts — which is exactly when the judder happens.

         The easing overshoots slightly past the target and settles back, which
         is what makes the growth read as the card coming forward rather than
         being stretched.

         `relative` plus a raised z-index on hover so the card that grew sits
         over its neighbours rather than under the next one's shadow.

         `motion-safe:` because this is decorative movement: a reader who has
         asked their system for less of it gets the card without the growth and
         nothing else missing. */
      className="relative flex cursor-pointer items-stretch transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:z-10 motion-safe:will-change-transform motion-safe:hover:scale-[1.03]"
    >
      {/* The two halves meet edge to edge — the seam between them is drawn, not
          spaced. Only the outer corners are rounded, so the join reads as one
          ticket torn down the middle rather than as two cards side by side.

          `rounded-l-[var(--radius-box)]` rather than `rounded-l-box`: daisyUI
          ships `rounded-box` as its own utility, and there is no per-side
          version of it. Reading the variable directly keeps this in step with
          the theme instead of hardcoding the 1rem it currently holds. */}
      <div
        /* Less padding at the top than on the other three sides: the badge row
           below is short and right-aligned, so a full 28px above it left the
           card looking hollow before it had said anything. */
        className={`min-w-0 flex-1 rounded-l-[var(--radius-box)] p-6 pt-4 text-white shadow-md sm:p-7 sm:pt-5 ${
          cyan ? 'bg-cyan-blue' : 'bg-royal-blue'
        }`}
      >
        {/* Its own row, above everything, at every width. In the flow rather
            than pinned to the corner: absolute meant every field beneath it had
            to carry padding to dodge it, and that reserved gap moved between the
            columns at the breakpoint. A row of its own costs one line and the
            fields underneath get the whole card back. */}
        {/* No margin under it. The badge is right-aligned and the label beneath
            it starts at the left, so the two never sit on top of each other and
            a gap between them only pushed the fields down the card. */}
        <div className="flex justify-end">
          <span
            /* Not `rounded-full`. Nothing else in this app is a pill, and at this
               size a fully round badge reads as a different component's leftover.
               `rounded-field` is the same 0.5rem the inputs and buttons use. */
            className={`inline-flex items-center gap-1.5 rounded-field px-2.5 py-1 text-xs font-bold ${status.className}`}
          >
            {status.label}
            <StatusIcon aria-hidden className="size-3.5" />
          </span>
        </div>

        {/* All four fields in one grid rather than two stacked rows, so the left
            column is sized once from its widest cell and Venue lines up under the
            slot time. Two separate grids each measured their own content and put
            the two right-hand columns in different places.

            `auto` rather than a fixed width for the same reason: the slot time
            is the widest thing in that column and it must not wrap, so it is
            what the column should be measured from. */}
        <div className="grid gap-y-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-10 sm:gap-y-8">
          <Field label="Time Slot">
            {/* Medium, not bold. It is the largest thing on the card already, so
                weight on top of size made it shout over the spots beside it —
                which are the other half of what the card is for. */}
            <p className="text-xl font-medium whitespace-nowrap tabular-nums sm:text-2xl">
              {booking.startTime} - {booking.endTime}
            </p>
          </Field>

          <Field label="Spots">
            <ul className="flex flex-wrap gap-2">
              {booking.spots.map((spot, index) => (
                /* The label is the venue's own wording for the spot ("First
                   guitar"), generated once by the API — so two guitars in one
                   booking are two different strings and this list has no
                   duplicates to key around. The index is the tiebreak for the
                   day that stops being true. */
                <li
                  key={`${spot}-${index}`}
                  className="rounded-field bg-white/20 px-3 py-1.5 text-sm font-medium"
                >
                  {spot}
                </li>
              ))}
            </ul>
          </Field>

          {/* No date here — the stub beside it is the date, at a size you can
              read across a room, and printing it twice on one ticket only made
              the second one look like a different fact.

              The jam's name sits under the venue with no label of its own: it
              reads as the second line of "where am I going", which is what it
              is, and a label would have made two fields out of one answer. */}
          <Field label="Venue">
            <p className="font-medium">{booking.venueName}</p>
            {/* Same white and same weight as the line above it, so the two read
                as one answer rather than as a name with a caption. */}
            <p className="font-medium">{booking.title}</p>
          </Field>

          {/* Dropped entirely rather than shown empty when the API predates
              `address` in the bookings projection — a labelled blank reads as a
              venue that forgot to fill it in. */}
          {booking.addressLines.length > 0 && (
            <Field label="Address">
              {booking.addressLines.map((line) => (
                <p key={line} className="font-medium">
                  {line}
                </p>
              ))}
            </Field>
          )}
        </div>
      </div>

      {/* The date stub. A fixed width rather than a share of the row, so a column
          of cards has its dates in one line down the page — which is the whole
          reason it is a separate block and not another field.

          `relative` so the two notches can hang off its left edge, which is the
          seam. Anchoring them here rather than on the article means neither of
          them has to know how wide this is. */}
      {/* The shadow is offset sideways with no vertical component, and that is
          deliberate rather than fussy. A shadow spreading in all directions put a
          dark lip along the bottom of the stub that did not continue under the
          coloured half beside it — so the two halves of one ticket looked like
          they were lying at different heights, and the seam's bottom notch had a
          shadow inside it. Throwing it to the right keeps the lift where the
          stub actually overhangs nothing. */}
      <div className="relative flex w-24 shrink-0 flex-col items-center justify-center rounded-r-[var(--radius-box)] bg-base-100 px-2 py-6 text-center shadow-[6px_0_14px_-4px_rgb(0_0_0_/_0.14)] sm:w-32">
        {/* The bite taken out of each end of the seam. Painted the page's own
            colour and pulled half outside the ticket, so what reads as a hole is
            really a disc sitting on top — which is the only way to punch through
            two differently coloured boxes at once without an SVG mask.

            The cost of that trick is that the colour is the page's, not the
            card's: on any background other than `bg-pale-blue` these stop being
            holes and start being spots. They belong to this page. */}
        <span
          aria-hidden
          className="absolute top-0 left-0 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pale-blue"
        />
        <span
          aria-hidden
          className="absolute bottom-0 left-0 size-5 -translate-x-1/2 translate-y-1/2 rounded-full bg-pale-blue"
        />

        {/* The perforation between the two notches. A repeated radial gradient
            rather than `border-dotted`, for two reasons: a dotted border draws
            its dots at the border's own width, so round ones mean a thick border
            pushing the layout around — and at the 2px that didn't, they were
            invisible on the cyan. This paints the dots at whatever size looks
            right without occupying any space at all.

            Inset past the notch radius at both ends, so the line stops where the
            holes start instead of running through them. */}
        <span
          aria-hidden
          className="absolute inset-y-3 -left-1 w-1"
          style={{
            /* 4px dots on a 7px pitch — the gap is smaller than the dot, which is
               what makes this read as a tear line rather than as a dotted rule.
               Widening the gap turns it into punctuation; shrinking the dot makes
               it disappear into the cyan. */
            backgroundImage:
              'radial-gradient(circle, rgb(255 255 255 / 0.8) 45%, transparent 46%)',
            backgroundSize: '4px 7px',
            backgroundRepeat: 'repeat-y',
          }}
        />
        <p className="text-sm font-bold tracking-wide text-dark-teal">
          {booking.dateParts.month}
        </p>
        {/* The card's own colour, so the stub belongs to the ticket it is torn
            from rather than reading as a separate white card beside it. */}
        <p
          className={`font-display text-4xl font-bold tabular-nums sm:text-5xl ${
            cyan ? 'text-cyan-blue' : 'text-royal-blue'
          }`}
        >
          {booking.dateParts.day}
        </p>
        <p className="text-sm font-medium text-dark-teal">{booking.dateParts.year}</p>
      </div>
    </article>
  );
}
