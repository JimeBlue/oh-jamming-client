import type { IconType } from 'react-icons/lib';
import { FaCircleCheck, FaCircleXmark, FaRegClock } from 'react-icons/fa6';

import { formatCardDate, type BookingCardStatus, type BookingCardView } from '@/lib/myBookings';

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
  /* Emerald on the cyan card. The only badge with a colour of its own: the other
     two sit on the same blue and are drawn out of it, because "past" and
     "cancelled" are the absence of the thing this page is for. */
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

/* Cyan for a night still to come, royal blue for one that is over or off. Two
   colours rather than three: past and cancelled are both "nothing to do here",
   and the badge is what tells them apart. */
const SURFACE: Record<BookingCardStatus, string> = {
  confirmed: 'bg-cyan-blue',
  past: 'bg-royal-blue',
  cancelled: 'bg-royal-blue',
};

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

export default function BookingCard({ booking }: { booking: BookingCardView }) {
  const status = STATUS[booking.status];
  const StatusIcon = status.icon;

  return (
    <article className="flex items-stretch">
      {/* The two halves meet edge to edge — the seam between them is drawn, not
          spaced. Only the outer corners are rounded, so the join reads as one
          ticket torn down the middle rather than as two cards side by side.

          `rounded-l-[var(--radius-box)]` rather than `rounded-l-box`: daisyUI
          ships `rounded-box` as its own utility, and there is no per-side
          version of it. Reading the variable directly keeps this in step with
          the theme instead of hardcoding the 1rem it currently holds. */}
      <div
        className={`relative min-w-0 flex-1 rounded-l-[var(--radius-box)] p-6 text-white sm:p-7 ${SURFACE[booking.status]}`}
      >
        {/* Out of the flow rather than in a row with the fields: the fields wrap
            to one column on a phone, and as a flex sibling the badge would wrap
            with them and land in the middle of the card. */}
        <span
          /* Not `rounded-full`. Nothing else in this app is a pill, and at this
             size a fully round badge reads as a different component's leftover.
             `rounded-field` is the same 0.5rem the inputs and buttons use. */
          className={`absolute top-5 right-5 inline-flex items-center gap-1.5 rounded-field px-2.5 py-1 text-xs font-bold ${status.className}`}
        >
          {status.label}
          <StatusIcon aria-hidden className="size-3.5" />
        </span>

        {/* All four fields in one grid rather than two stacked rows, so the left
            column is sized once from its widest cell and Date lines up under the
            slot time. Two separate grids each measured their own content and put
            the two right-hand columns in different places.

            `auto` rather than a fixed width for the same reason: the slot time
            is the widest thing in that column and it must not wrap, so it is
            what the column should be measured from. */}
        <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-10">
          {/* Clearance for the badge, which is out of the flow above it. On a
              phone the badge sits over this field; from `sm` the columns are
              side by side and it sits over the spots instead. */}
          <Field label="Time Slot" className="pr-24 sm:pr-0">
            <p className="text-xl font-bold whitespace-nowrap tabular-nums sm:text-2xl">
              {booking.startTime} - {booking.endTime}
            </p>
          </Field>

          <Field label="Spots" className="sm:pr-28">
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

          <Field label="Date">
            <p className="font-medium whitespace-nowrap">
              {formatCardDate(booking.dateParts)}
            </p>
          </Field>

          {/* The design has the venue's street address here, and this does not:
              `GET /bookings` populates four fields off the session — title, date,
              venueName, status — and the address is not one of them. Showing the
              night and the room it is in is the honest version of that until the
              API's projection says otherwise. */}
          <Field label="Venue">
            <p className="font-medium">{booking.venueName}</p>
            <p className="text-sm text-white/70">{booking.title}</p>
          </Field>
        </div>
      </div>

      {/* The date stub. A fixed width rather than a share of the row, so a column
          of cards has its dates in one line down the page — which is the whole
          reason it is a separate block and not another field.

          `relative` so the two notches can hang off its left edge, which is the
          seam. Anchoring them here rather than on the article means neither of
          them has to know how wide this is. */}
      <div className="relative flex w-24 shrink-0 flex-col items-center justify-center rounded-r-[var(--radius-box)] bg-base-100 px-2 py-6 text-center sm:w-32">
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
            backgroundImage:
              'radial-gradient(circle, rgb(255 255 255 / 0.75) 45%, transparent 46%)',
            backgroundSize: '4px 9px',
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
            booking.status === 'confirmed' ? 'text-cyan-blue' : 'text-royal-blue'
          }`}
        >
          {booking.dateParts.day}
        </p>
        <p className="text-sm font-medium text-dark-teal">{booking.dateParts.year}</p>
      </div>
    </article>
  );
}
