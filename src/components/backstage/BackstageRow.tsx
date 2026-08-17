'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaEye, FaRegImage } from 'react-icons/fa6';

import { canCancelJam, jamStatus, type JamStatus } from '@/lib/jamStatus';
import { utcMidnightToDateString } from '@/lib/time';
import type { JamSession } from '@/schemas/jamSession';
import JamStatusBadge from './JamStatusBadge';

/* The card's fill *is* its status — the badge only names what the colour already
   said. Which is why past and cancelled share one entry: a night that is over and
   a night that was called off are both nothing the venue can act on, and the
   board's job at a glance is to separate the rows with work left in them from the
   rows without. The badge still says which of the two it was, because that is the
   one thing the colour genuinely can't.

   `ink` is the same colour as `fill`, for the white controls that sit on it —
   the eye is drawn in the card's own colour rather than in a neutral dark, so
   the button reads as a hole cut in the card rather than as a foreign chip laid
   on it. Both halves are written out because Tailwind scans for whole class
   names: `bg-${x}` built at runtime is a class in the markup and nowhere in the
   stylesheet. */
const CARD: Record<JamStatus, { fill: string; ink: string }> = {
  upcoming: { fill: 'bg-royal-blue', ink: 'text-royal-blue' },
  today: { fill: 'bg-cyan-blue', ink: 'text-cyan-blue' },
  past: { fill: 'bg-status-past', ink: 'text-status-past' },
  cancelled: { fill: 'bg-status-past', ink: 'text-status-past' },
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/* Split off the "YYYY-MM-DD" string rather than through a Date. The whole point
   of `utcMidnightToDateString` is that the day is already the venue's own — handing
   it to a Date here would put the browser's timezone back in and move a jam that
   starts at 00:30 to the day before for anyone west of the room. */
const splitDay = (day: string) => {
  const [year, month, date] = day.split('-');

  return {
    year,
    month: MONTHS[Number(month) - 1] ?? '',
    /* Leading zero dropped: the design sets this at 40px, where "07" reads as a
       different number rather than as the seventh. */
    date: String(Number(date)),
  };
};

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="font-display text-xs font-bold text-white/70">{children}</p>
);

/* One night on the venue's board, as a card in its status' colour.
   Was a table row with a Status column beside it; the column headings went with
   the table, because a card that is entirely one colour has nothing left to line
   up under a heading called "Status". */
export default function BackstageRow({
  session,
  onCancel,
}: {
  session: JamSession;
  onCancel: () => void;
}) {
  const status = jamStatus(session);
  const { year, month, date } = splitDay(utcMidnightToDateString(session.date));

  return (
    /* The photo sits *under* the coloured pane's right edge rather than beside
       it, which is what leaves the pane's own rounded corner cut out of it. One
       rounded rectangle overlapping another, not a card divided in two. */
    /* The same lift the musician's booking cards make on /my-bookings, down to
       the easing: it overshoots slightly and settles back, which is what makes
       the growth read as the card coming forward rather than being stretched.
       `relative` plus a raised z-index on hover so the card that grew sits over
       its neighbours rather than under the next one's shadow, and `motion-safe:`
       because this is decorative — a reader who asked their system for less
       movement gets the card without it and nothing else missing. */
    <li className="relative flex cursor-pointer items-stretch transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:z-10 motion-safe:will-change-transform motion-safe:hover:scale-[1.03]">
      <div
        /* min-w-0 on the pane as well as on the text column inside it. `flex-1`
           alone doesn't let it shrink: a flex item defaults to min-width:auto and
           refuses to go below its own content, so on a phone the card grew wider
           than the screen instead of the title truncating. */
        className={`relative z-10 flex min-w-0 flex-1 gap-4 rounded-box p-4 text-white sm:gap-6 sm:p-6 ${CARD[status].fill}`}
      >
        {/* The date, as the thing the eye lands on first. A tint of white rather
            than a colour of its own, so it holds against all three card fills
            without a fourth entry in the map above. */}
        {/* `self-start` below `sm`, where the card is tall because the badge,
            title, time and buttons are stacked — left to stretch, the date block
            grew to that whole height and became a column of empty colour. From
            `sm` up the card is only as tall as this block wants to be, so
            stretching is what makes it the full-height panel the design has. */}
        <div className="w-20 shrink-0 self-start rounded-box bg-white/20 px-2 py-4 text-center sm:w-28 sm:self-stretch sm:px-5 sm:py-5">
          <p className="font-display text-xs font-bold tracking-[0.18em] uppercase text-white/80">
            {month}
          </p>
          <p className="font-display text-3xl font-bold sm:text-5xl">{date}</p>
          <p className="font-display text-xs font-bold text-white/80 sm:text-sm">
            {year}
          </p>
        </div>

        {/* min-w-0 so a long title truncates instead of shoving the badge off the
            card — a flex item defaults to min-width:auto and refuses to shrink
            below its own content. */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {/* The badge takes a line of its own at every width — `col-reverse`
              puts it above the title rather than beside it. Sharing the row cost
              the title the width the badge took, which on a phone left it about
              eight characters to truncate into. It stays right-aligned from `sm`,
              where the card is wide enough that the status belongs at the end of
              the row a venue scans down. */}
          <div className="flex flex-col-reverse items-start gap-2">
            <div className="w-full min-w-0">
              <Eyebrow>Jam Session</Eyebrow>
              <h3 className="truncate font-display text-xl font-bold sm:text-2xl">
                {session.title}
              </h3>
            </div>

            {/* Wrapped because the alignment belongs to the slot, not to the
                badge — it is drawn on the detail header too, where it is not a
                flex child of anything. */}
            <div className="sm:self-end">
              <JamStatusBadge status={status} tone="onColor" />
            </div>
          </div>

          {/* Time and the actions on one line, pushed apart — and `mt-auto` is
              what pins them to the bottom of a card whose height is set by the
              date block beside them. */}
          <div className="flex flex-col items-start gap-4 sm:mt-auto sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div>
              <Eyebrow>Time</Eyebrow>
              <p className="font-display text-lg font-bold">
                {session.startTime} - {session.endTime}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* A link, not a button: it goes somewhere, so it should
                  middle-click into a new tab and offer "copy link address" like
                  anything else that does.

                  Enabled on every status, cancelled included — the detail page is
                  the only place that says who was booked on a night that got
                  called off, and a venue asking that question is exactly who
                  clicks this. */}
              <Link
                href={`/my-backstage/${session.id}`}
                aria-label={`View ${session.title}`}
                className={`btn btn-square border-base-100 bg-base-100 shadow-none transition-colors hover:bg-transparent hover:text-white ${CARD[status].ink}`}
              >
                <FaEye className="size-5" />
              </Link>

              {/* Absent rather than disabled on a night that is over or already
                  called off. The design has no dimmed control here, and there is
                  nothing left to explain: the card is grey and the badge says
                  which of the two happened. */}
              {canCancelJam(session) && (
                <button
                  type="button"
                  onClick={onCancel}
                  /* Names the session, and still opens with the visible word,
                     which is what keeps voice control working — "click Cancel"
                     has to match. */
                  aria-label={`Cancel ${session.title}`}
                  /* The card's own colour, darkened — black at 40% over whatever
                     fill it is sitting on, which keeps the hue and only takes the
                     light out of it. So the button is teal on the Today card and
                     blue on an upcoming one without a per-status entry anywhere:
                     it can't drift from the card because it *is* the card.
                     A named dark (brand-navy) was the wrong move here — it holds
                     its own hue rather than the card's, and read as a hole
                     punched in the fill. */
                  className="btn border-transparent bg-black/40 font-bold text-white shadow-none transition-colors hover:border-white hover:bg-transparent hover:text-white"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pulled a notch left so the coloured pane paints over it — see the li. Hidden
          below `sm`, where the card is already a column and a strip of photo
          beside it would be 40px wide. */}
      <div className="-ml-4 hidden w-44 shrink-0 overflow-hidden rounded-e-box bg-base-100 sm:block">
        {session.image ? (
          <Image
            src={session.image}
            /* Empty on purpose: the card says the session's name in words an inch
               away, and an alt here would announce it twice. */
            alt=""
            width={176}
            height={220}
            className="size-full object-cover"
          />
        ) : (
          <div aria-hidden className="grid size-full place-items-center">
            <FaRegImage className="size-8 text-royal-blue/25" />
          </div>
        )}
      </div>
    </li>
  );
}
