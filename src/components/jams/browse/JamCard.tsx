import Image from 'next/image';
import Link from 'next/link';
import {
  FaArrowRight,
  FaLocationDot,
  FaRegClock,
  FaRegImage,
} from 'react-icons/fa6';

import { GENRE_LABELS } from '@/config/jamOptions';
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
  const { free } = jamReport(session);

  /* "Tonight" reads better than today's own date on a card whose whole job is
     urgency — and it is the same day-granular answer the board's badge gives,
     from the same function, so the two can't disagree about which day it is. */
  const isToday = jamStatus(session) === 'today';
  const when = isToday ? 'Tonight' : formatShortDate(day);

  return (
    <li className="flex flex-col overflow-hidden rounded-box bg-base-100 shadow-lg transition-shadow hover:shadow-2xl">
      <div className="relative aspect-video w-full bg-primary/10">
        {session.image ? (
          <Image
            src={session.image}
            /* Empty: the title is two lines below, in words. An alt repeating it
               makes a screen reader announce the session twice — same call as
               `JamThumbnail`. */
            alt=""
            fill
            /* Five across at the widest, four from xl, then three, two, one.
               Without this next/image assumes full-bleed and ships a 1600px file
               to fill a 320px card. The top entry covers xl and 2xl together
               because the two land within a few pixels of each other — five
               cards in the wider container is the same card width as four in the
               narrower one. */
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
            grid of twelve — the same job the board's inverted "Today" badge does,
            said in the palette this side of the app uses. */}
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
        {/* min-w-0 on the venue half and nowhere else: a flex item refuses to
            shrink below its content by default, so a long venue name pushes the
            time off the row instead of truncating itself. */}
        <p className="flex items-center gap-4 text-sm text-base-content/80">
          <span className="flex shrink-0 items-center gap-1.5">
            <FaRegClock aria-hidden className="size-3.5 text-primary" />
            <span className="tabular-nums">{session.startTime}</span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <FaLocationDot aria-hidden className="size-3.5 shrink-0 text-primary" />
            <span className="truncate">{session.venueName}</span>
          </span>
        </p>

        {/* Clamped rather than truncated. Two lines is where a jam title stops
            being a name and starts being a sentence, and cutting one of those at
            the first line loses the half that says what the night is. */}
        <h3 className="line-clamp-2 font-heading text-lg leading-tight">
          {session.title}
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          {/* Two, then a count. Every genre on a card that is 290px wide wraps
              into three rows and pushes the button off the fold, and a musician
              filtering by genre already knows which one they asked for. */}
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

          {session.genres.length > 2 && (
            <span className="text-xs font-bold text-base-content/60">
              +{session.genres.length - 2}
            </span>
          )}
        </div>

        {/* Counted from the spots, via the same report the venue's cockpit
            reads — there is no availability counter anywhere to fall out of step
            with, and a second implementation of this sum is a second answer
            waiting to disagree. */}
        <p className="text-sm font-bold">
          {free === 0 ? (
            <span className="text-status-empty">Fully booked</span>
          ) : (
            <span className="text-status-full">
              {free} spot{free === 1 ? '' : 's'} left
            </span>
          )}
        </p>

        {/* mt-auto is what makes a grid of cards line their buttons up: the
            titles above run to one line or two, and without this the button
            floats up under the short ones. */}
        <Link
          href={`/jams/${session.id}`}
          /* Names the session, and opens with the visible words so voice control
             still matches on "click Book a spot" — twelve identical link names
             in a screen reader's list is the thing this is fixing. */
          aria-label={`${free === 0 ? 'See the night' : 'Book a spot'} — ${session.title}`}
          className="btn btn-secondary mt-auto w-full justify-between font-bold"
        >
          {free === 0 ? 'See the night' : 'Book a spot'}
          <FaArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    </li>
  );
}
