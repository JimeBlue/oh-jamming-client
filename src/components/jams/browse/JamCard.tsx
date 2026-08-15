import Image from 'next/image';
import Link from 'next/link';
import {
  FaArrowRight,
  FaChartSimple,
  FaLocationDot,
  FaRegClock,
  FaRegImage,
} from 'react-icons/fa6';

import { GENRE_LABELS, SKILL_LEVEL_LABELS } from '@/config/jamOptions';
import { formatShortDate } from '@/lib/jamListing';
import { jamReport } from '@/lib/jamReport';
import { jamStatus } from '@/lib/jamStatus';
import { utcMidnightToDateString } from '@/lib/time';
import { ALL_GENRES, type JamSession } from '@/schemas/jamSession';

/* One jam on the browse.

   The card is the musician's version of `BackstageRow`, and it answers a
   different question. The row is a venue asking "what did I post, and can I
   still change it?"; this is someone deciding whether to spend an evening on it.
   So what it leads with is when, where and whether there is anything left —
   never a status badge, because every session the browse returns is active and
   still ahead.

   No heart, unlike the design it comes from: favourites don't exist, and a
   control that visibly does nothing is worse than one that isn't there. */
export default function JamCard({ session }: { session: JamSession }) {
  const day = utcMidnightToDateString(session.date);

  /* Only to decide what the button promises — a sold-out night still belongs on
     the browse, but "Book a spot" on it is a lie. Counted through the same
     report the venue's cockpit reads rather than summed here: there is no
     availability counter anywhere, only spots with a booking on them, and a
     second implementation of that sum is a second answer waiting to disagree. */
  const { free } = jamReport(session);

  /* `skillLevel` is an array on the wire and the API requires at least one, so
     this is only ever undefined for a document written before that rule — worth
     guarding rather than indexing blind. */
  const [level] = session.skillLevel;

  /* "Tonight" reads better than today's own date on a card whose whole job is
     urgency — and it is the same day-granular answer the board's badge gives,
     from the same function, so the two can't disagree about which day it is. */
  const isToday = jamStatus(session) === 'today';
  const when = isToday ? 'Tonight' : formatShortDate(day);

  const cta = free === 0 ? 'See the night' : 'Book a spot';

  return (
    <li className="overflow-hidden rounded-box bg-base-100 shadow-lg transition-shadow hover:shadow-2xl">
      {/* The whole card is the link, and there is exactly one of them — the CTA
          at the bottom is a styled `<span>`, not a second `<a>`. A link inside a
          link is invalid HTML, and it would give the card two focus stops that
          go to the same place.

          `aria-label` names it with the title alone. Left to itself the
          accessible name is everything inside — time, venue, title, chips and
          the button's words run together into one announcement — which is what
          a card link usually sounds like and is worth overriding.

          `h-full` so it fills the grid cell: the `<li>` stretches to match the
          tallest card in its row, and without this the link stops at its own
          content and the `mt-auto` below has no slack left to push with. */}
      <Link
        href={`/jams/${session.id}`}
        aria-label={session.title}
        className="flex h-full flex-col"
      >
        <div className="relative aspect-video w-full bg-primary/10">
          {session.image ? (
            <Image
              src={session.image}
              /* Empty: the title is two lines below, in words. An alt repeating
                 it makes a screen reader announce the session twice — same call
                 as `JamThumbnail`. */
              alt=""
              fill
              /* Five across at the widest, four from xl, then three, two, one.
                 Without this next/image assumes full-bleed and ships a 1600px
                 file to fill a 320px card. The top entry covers xl and 2xl
                 together because the two land within a few pixels of each other
                 — five cards in the wider container is the same card width as
                 four in the narrower one. */
              sizes="(min-width: 1280px) 21rem, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div aria-hidden className="grid h-full place-items-center">
              <FaRegImage className="size-10 text-primary/40" />
            </div>
          )}

          {/* Pink tonight, indigo otherwise. The one card a musician can act on
              today is the one that should be findable by colour while scanning a
              grid of twelve — the same job the board's inverted "Today" badge
              does, said in the palette this side of the app uses. */}
          {when && (
            <span
              className={`absolute left-3 top-3 rounded-field px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                isToday
                  ? 'bg-brand-pink-deep text-white'
                  : 'bg-primary text-primary-content'
              }`}
            >
              {when}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          {/* Full-strength base-content and bold, glyphs included — when and
              where are the two facts a musician scans a grid for, so this row is
              read before the title rather than after it. Nothing sets a colour,
              which is what keeps the icons in step with the words beside them.

              min-w-0 on the venue half and nowhere else: a flex item refuses to
              shrink below its content by default, so a long venue name pushes
              the time off the row instead of truncating itself. */}
          <p className="flex items-center gap-4 text-sm font-bold">
            <span className="flex shrink-0 items-center gap-1.5">
              <FaRegClock aria-hidden className="size-3.5" />
              <span className="tabular-nums">{session.startTime}</span>
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <FaLocationDot aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{session.venueName}</span>
            </span>
          </p>

          {/* Clamped rather than truncated. Two lines is where a jam title stops
              being a name and starts being a sentence, and cutting one of those
              at the first line loses the half that says what the night is. */}
          <h3 className="line-clamp-2 font-heading text-lg leading-tight">
            {session.title}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {/* The first two only, and silently — every genre on a card this
                wide wraps into three rows and pushes the button off the fold,
                and a musician filtering by genre already knows which one they
                asked for. */}
            {session.genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                /* Green for the catch-all, read off the stored value rather than
                   the label — same rule as the listing's chips, because it means
                   the same thing: this one isn't narrowing the night down. */
                className={`rounded-field px-2.5 py-1 text-xs font-bold ${
                  genre === ALL_GENRES
                    ? 'bg-brand-green/25 text-status-upcoming'
                    : 'bg-secondary/15 text-brand-pink-deep'
                }`}
              >
                {GENRE_LABELS[genre]}
              </span>
            ))}

            {/* The level, at the far end of the genre row. Two answers to "is
                this night for me?" reading from opposite edges rather than as a
                third chip in the same run — which is also what stops it being
                mistaken for a genre.

                The first only, like the genres: a session tagged for two levels
                is rare, and the space here is one pill wide.

                `FaChartSimple` is the listing's own mark for skill level, so the
                browse and the page it leads to agree about what the glyph means.
                It takes the pill's colour rather than the listing's green,
                because there it sits on white with a heading beside it and here
                it is inside a tinted lozenge. */}
            {level && (
              <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-field bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                <FaChartSimple aria-hidden className="size-3.5" />
                {SKILL_LEVEL_LABELS[level]}
              </span>
            )}
          </div>

          {/* mt-auto is what makes a grid of cards line their buttons up: the
              titles above run to one line or two, and without this the button
              floats up under the short ones. It collapses to nothing on the tall
              cards, though, which is what the padding is for — the button keeps
              its gap above even when there is no slack left to distribute. */}
          <div className="mt-auto pt-3">
            {/* A `<span>` wearing `.btn`, because the card around it is already
                the link. It is the affordance, not the control — so no
                `aria-label` and nothing focusable: a screen reader meets one
                link named after the session, which is the whole card. */}
            <span className="btn btn-secondary w-full justify-between font-bold">
              {cta}
              <FaArrowRight aria-hidden className="size-4" />
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}
