import Link from 'next/link';
import { FaArrowLeftLong, FaLocationDot } from 'react-icons/fa6';

import { jamStatus } from '@/lib/jamStatus';
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

  return (
    <header className="rounded-box bg-base-100 p-4 shadow-xl sm:p-6">
      <div className="flex flex-wrap items-start gap-4 sm:gap-6">
        <JamThumbnail image={session.image} size="header" />

        {/* min-w-0 is what lets the title wrap instead of shoving the date badge
            off the card — a flex item defaults to min-width:auto and refuses to
            shrink below its content. */}
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl sm:text-3xl">{session.title}</h1>
            {/* Not in the design, and kept anyway: it is the one place this page
                says a night was called off, and the cockpit behind it changes
                shape entirely when it was. The same badge as the board, so the
                row a venue clicked and the page it landed on agree. */}
            <JamStatusBadge status={jamStatus(session)} />
          </div>

          <p className="mt-2 flex items-start gap-2 text-sm text-base-content/80">
            <FaLocationDot aria-hidden className="mt-1 size-3.5 shrink-0 text-primary" />
            <span>
              <span className="font-medium">{session.venueName}</span>
              {session.address.formatted && (
                <span className="block">{session.address.formatted}</span>
              )}
            </span>
          </p>

          <p className="mt-1 text-sm tabular-nums text-base-content/80">
            {session.startTime} – {session.endTime}
          </p>
        </div>

        {/* Pushed to the far end on its own row below `sm`, where the card is
            narrow enough that a date block beside a wrapping title is a column
            two words wide. */}
        <div className="flex flex-1 basis-full flex-col items-start gap-4 sm:basis-auto sm:items-end">
          <div className="w-24 overflow-hidden rounded-box border border-secondary text-center">
            <p className="bg-secondary px-2 py-1 text-xs font-bold tracking-wide text-secondary-content uppercase">
              {month}
            </p>
            <p className="px-2 pt-2 font-heading text-3xl leading-none">{day}</p>
            <p className="px-2 pb-2 text-xs text-base-content/60">{year}</p>
          </div>

          {/* The only way out. `sm:mt-auto` pins it to the bottom of the card
              beside the taller left column, where the design has it, without
              giving the card a fixed height. */}
          <Link
            href="/my-backstage"
            className="flex items-center gap-2 font-bold text-primary hover:underline sm:mt-auto"
          >
            <FaArrowLeftLong aria-hidden className="size-4" />
            My backstage
          </Link>
        </div>
      </div>
    </header>
  );
}
