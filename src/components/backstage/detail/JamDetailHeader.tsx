import Link from 'next/link';
import { AiFillClockCircle } from 'react-icons/ai';
import { FaArrowLeftLong, FaLocationDot, FaRegCalendar } from 'react-icons/fa6';

import { formatListingDate } from '@/lib/jamListing';
import { jamStatus } from '@/lib/jamStatus';
import { utcMidnightToDateString } from '@/lib/time';
import type { JamSession } from '@/schemas/jamSession';
import JamStatusBadge from '../JamStatusBadge';
import JamThumbnail from '../JamThumbnail';

/* Which night this page is about, above whichever panel is showing.

   In the layout rather than in each panel: it is the same card on all three
   routes, and repeating it would let the three drift. It also means moving
   between sections repaints only the panel — the card is already mounted. */

/* Pinned to UTC, like every other formatter that touches a jam date: the value
   is a calendar day marked at midnight UTC, and reading it with local getters
   hands back the day before for anyone west of Greenwich. Built once at module
   load rather than per render — an Intl formatter is not cheap and this one
   never varies. */
const dateParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const readDate = (date: Date) => {
  const parts = Object.fromEntries(
    dateParts.formatToParts(date).map(({ type, value }) => [type, value]),
  );

  return { day: parts.day ?? '', month: parts.month ?? '', year: parts.year ?? '' };
};

export default function JamDetailHeader({ session }: { session: JamSession }) {
  const { day, month, year } = readDate(session.date);
  const fullDate = formatListingDate(utcMidnightToDateString(session.date));

  return (
    <header className="rounded-box bg-base-100 p-4 shadow-xl sm:p-6">
      {/* Grid rather than a wrapping flex row, because the pieces move between
          *cells* rather than just wrapping — the title sits above the photo on a
          phone and beside it from `sm`, and the badge starts below the photo and
          ends up next to the title. Flex `order` can't express that: the title
          would have to be a sibling of the photo to sit above it and a child of
          the text column to sit beside it, and the only way out is rendering the
          heading twice, which is two h1s and a duplicate for anyone reading the
          page aloud.

          Three layouts:

            phone      one column — title, photo, badge, details
            480px      two columns, title and badge sharing the first row
            sm         three columns — photo, the text column, and the date

          480px is a hand-picked breakpoint rather than one of the theme's,
          because it is about this card and nothing else: it is where the title
          and the badge stop fitting on one line together on the phones people
          actually hold.

          Every row is numbered explicitly, including in the one-column layout
          where source order would have done the job on its own. That is what
          frees the title and the badge to sit together in the markup — see the
          wrapper below — while still landing either side of the photo. */}
      <div className="grid gap-4 min-[480px]:grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-6">
        {/* Two grid cells that become one flex row at `sm`, via `display:
            contents` — which takes this wrapper out of the layout entirely and
            promotes the heading and the badge to grid items in its place.

            The pair have to be separate cells below `sm` so the badge can drop
            *below the photo*, which it can't do from inside a shared row. From
            `sm` they have to be one flex row instead, and that is not cosmetic:
            as its own track the badge sat in a `minmax(0,1fr)` column, which the
            grid will collapse to zero rather than shrink the title's `auto`
            track — so between 641px and 800px the badge overflowed its column
            and painted straight over the date panel. As a flex sibling it simply
            wraps under the title when the column gets tight, which is the right
            answer at those widths and needs no breakpoint to ask for. */}
        <div className="contents sm:col-start-2 sm:row-start-1 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          {/* min-w-0 so a long title wraps inside its own column instead of
              widening it and pushing the badge off the row. */}
          <h1 className="row-start-1 min-w-0 font-heading text-2xl sm:text-3xl">
            {session.title}
          </h1>

          {/* Not in the design, and kept anyway: it is the one place this page
              says a night was called off, and the cockpit behind it changes
              shape entirely when it was. The same badge as the board, so the row
              a venue clicked and the page it landed on agree. */}
          <div className="row-start-3 min-[480px]:col-start-2 min-[480px]:row-start-1 min-[480px]:self-center min-[480px]:justify-self-start">
            <JamStatusBadge status={jamStatus(session)} />
          </div>
        </div>

        <div className="row-start-2 min-[480px]:col-span-full sm:col-span-1 sm:col-start-1 sm:row-span-2 sm:row-start-1">
          <JamThumbnail image={session.image} size="header" />
        </div>

        <div className="row-start-4 min-w-0 min-[480px]:col-span-full min-[480px]:row-start-3 sm:col-span-1 sm:col-start-2 sm:row-start-2">
          <p className="flex items-start gap-2 text-sm text-base-content/80">
            <FaLocationDot aria-hidden className="mt-1 size-3.5 shrink-0 text-primary" />
            <span>
              <span className="font-medium">{session.venueName}</span>
              {session.address.formatted && (
                <span className="block">{session.address.formatted}</span>
              )}
            </span>
          </p>

          {/* Two shapes of the same fact, one per layout.

              On a phone the calendar block carries the whole thing, because the
              date panel that would otherwise hold it is hidden below `sm` — see
              the note on it. Both lines are the same weight and the same grey:
              the time is not a footnote to the date, it is the other half of
              when to turn up. `items-start` plus the nudge sets the icon against
              the first line rather than centring it across both.

              From `sm` the panel is back and says the date in three lines of its
              own, so repeating it here would be the same information twice in
              one card. Only the time is left, and it gets the clock. */}
          {fullDate && (
            <p className="mt-1 flex items-start gap-2 text-sm text-base-content/80 sm:hidden">
              <FaRegCalendar aria-hidden className="mt-1 size-3.5 shrink-0 text-primary" />
              <span>
                <span className="block">{fullDate}</span>
                <span className="block tabular-nums">
                  {session.startTime} – {session.endTime}
                </span>
              </span>
            </p>
          )}

          <p className="mt-1 hidden items-center gap-2 text-sm text-base-content/80 sm:flex">
            <AiFillClockCircle aria-hidden className="size-3.5 shrink-0 text-primary" />
            <span className="tabular-nums">
              {session.startTime} – {session.endTime}
            </span>
          </p>
        </div>

        <div className="row-start-5 flex flex-col items-start gap-4 min-[480px]:col-span-full min-[480px]:row-start-4 sm:col-span-1 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:items-end">
          {/* Hidden on a phone, where it was the second of two separate answers
              to "when?" and the taller one — a three-line panel saying what the
              calendar line above now says in a sentence. It earns its space from
              `sm`, where it sits in a column of its own rather than eating a
              block of the card's only one. */}
          <div className="hidden w-24 overflow-hidden rounded-box border border-secondary text-center sm:block">
            <p className="bg-secondary px-2 py-1 text-xs font-bold tracking-wide text-secondary-content uppercase">
              {month}
            </p>
            <p className="px-2 pt-2 font-heading text-3xl leading-none">{day}</p>
            <p className="px-2 pb-2 text-xs text-base-content/60">{year}</p>
          </div>

          {/* The only way out. `sm:mt-auto` pins it to the bottom of the column
              beside the taller photo, where the design has it, without giving
              the card a fixed height.

              Colour rather than an underline on hover: the arrow and the weight
              already say this is a link, so the underline was only ever adding
              a second signal — and the pink is the site's accent, so hovering
              here answers in the app's own voice. */}
          <Link
            href="/my-backstage"
            className="flex items-center gap-2 font-bold text-primary hover:text-secondary sm:mt-auto"
          >
            <FaArrowLeftLong aria-hidden className="size-4" />
            My backstage
          </Link>
        </div>
      </div>
    </header>
  );
}
