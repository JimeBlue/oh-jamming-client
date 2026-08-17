import Image from 'next/image';
import Link from 'next/link';
import { FaArrowRight, FaLocationDot, FaRegClock, FaRegImage } from 'react-icons/fa6';

import { GENRE_LABELS, SKILL_LEVEL_LABELS } from '@/config/jamOptions';
import { cityFromAddress, formatShortDateParts } from '@/lib/jamListing';
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

  /* Three chips on a card, never a fourth, and the genres get first refusal:
     two of them and one level, or one and two levels when the venue only tagged
     one genre. Past three they wrap into a second row and push the button off
     the fold, and a musician filtering by genre already knows which one they
     asked for.

     Both arrays are required by the API and both can hold more than the card
     shows, so this is a display cap rather than a guard — but `slice` is also
     what makes the empty case safe for a document written before either rule. */
  const genres = session.genres.slice(0, 2);
  const levels = session.skillLevel.slice(0, Math.min(2, 3 - genres.length));

  /* "Tonight" reads better than today's own date on a card whose whole job is
     urgency — and it is the same day-granular answer the board's badge gives,
     from the same function, so the two can't disagree about which day it is. */
  const isToday = jamStatus(session) === 'today';
  const when = isToday ? null : formatShortDateParts(day);

  const cta = free === 0 ? 'See the night' : 'Book a spot';

  /* The city, falling back to the venue's name when the address line has no
     postcode to read it off. Which room it is matters once you're deciding
     between two nights; which town it is decides whether you read the card at
     all, and it is also the thing the filter above the grid searches by. */
  const where = cityFromAddress(session.address.formatted) ?? session.venueName;

  return (
    <li>
      {/* The whole card is the link, and there is exactly one of them — the CTA
          at the bottom is a styled `<span>`, not a second `<a>`. A link inside a
          link is invalid HTML, and it would give the card two focus stops that
          go to the same place.

          `aria-label` names it with the title alone. Left to itself the
          accessible name is everything inside — time, venue, title, chips and
          the button's words run together into one announcement — which is what
          a card link usually sounds like and is worth overriding.

          The card lifts and deepens its shadow under the pointer while the photo
          grows inside its own frame. It replaced daisyUI's `hover-3d`, which
          tilted the card towards the cursor and needed eight empty absolutely
          positioned zones laid over it to know where the cursor was — an effect
          this grid didn't need and a layer of decoy elements between every card
          and its own contents.

          `block h-full` because an anchor is inline by default and would sit at
          its content's height, leaving the card short of the row its neighbours
          stretch to. `hover-3d` used to supply that by making it a grid. */}
      <Link
        href={`/jams/${session.id}`}
        aria-label={session.title}
        className="group block h-full w-full transition-transform duration-300 motion-safe:hover:-translate-y-2"
      >
        {/* `overflow-hidden` is what keeps the growing photo inside the card's
            rounded top corners — it came free with `hover-3d`'s own clipping
            before, and without it the image squares them off on hover. */}
        <div className="relative flex h-full flex-col overflow-hidden rounded-box bg-base-100 shadow-lg transition-shadow duration-300 group-hover:shadow-2xl">
          <div className="relative aspect-video w-full bg-cyan-blue/10">
            {session.image ? (
              <Image
                src={session.image}
                /* Empty: the title is two lines below, in words. An alt
                   repeating it makes a screen reader announce the session twice
                   — same call as `JamThumbnail`. */
                alt=""
                fill
                /* Four across at the widest, then three, two, one. Without this
                   next/image assumes full-bleed and ships a 1600px file to fill
                   a 290px card. The first entry is a width rather than a vw:
                   past `xl` the container is capped at 7xl, so the card stops
                   growing with the window. */
                sizes="(min-width: 1280px) 18rem, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                /* The photo grows a little inside a frame that doesn't, which
                   is the half of the hover that says the card is a door. Only
                   the image scales — the date badge is a sibling in this box
                   and stays where it is. */
                className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
              />
            ) : (
              <div aria-hidden className="grid h-full place-items-center">
                <FaRegImage className="size-10 text-cyan-blue/40" />
              </div>
            )}

            {/* Dark teal carrying a lime weekday, which is the design's badge —
                the weekday is what the eye lands on when scanning a grid for a
                night that suits, and the date it belongs to follows in white.

                Tonight inverts the whole tile to lime instead. The one card a
                musician can act on today has to be findable by colour rather
                than by reading, and inverting is the strongest signal the two
                colours already on the badge can make between them. */}
            {isToday ? (
              <span className="absolute left-3 top-3 rounded-field bg-accent px-3 py-1 text-xs font-bold text-dark-teal">
                Tonight
              </span>
            ) : (
              when && (
                <span className="absolute left-3 top-3 rounded-field bg-dark-teal px-3 py-1 text-xs font-bold text-white">
                  <span className="text-accent">{when.weekday}</span> {when.rest}
                </span>
              )
            )}
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            {/* When and where are the two facts a musician scans a grid for, so
                this row is read before the title rather than after it. The
                glyphs take the cyan and the words the dark teal: the icon is
                the thing that makes the row scannable at a glance and the words
                are what is actually read, and giving them one colour flattened
                the pair into a line of text.

                min-w-0 on the place half and nowhere else: a flex item refuses
                to shrink below its content by default, so a long name pushes
                the time off the row instead of truncating itself. */}
            <p className="flex items-center gap-4 text-sm font-bold text-dark-teal">
              <span className="flex shrink-0 items-center gap-1.5">
                <FaRegClock aria-hidden className="size-3.5 text-cyan-blue" />
                <span className="tabular-nums">{session.startTime}</span>
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <FaLocationDot aria-hidden className="size-3.5 shrink-0 text-cyan-blue" />
                <span className="truncate">{where}</span>
              </span>
            </p>

            {/* Clamped rather than truncated. Two lines is where a jam title
                stops being a name and starts being a sentence, and cutting one
                of those at the first line loses the half that says what the
                night is. */}
            <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight text-dark-teal">
              {session.title}
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              {genres.map((genre) => (
                <span
                  key={genre}
                  /* Green for the catch-all, read off the stored value rather
                     than the label — same rule as the listing's chips, because
                     it means the same thing: this one isn't narrowing the night
                     down. The wash changes and the ink doesn't, so it reads as
                     the same chip in a different colour rather than as a
                     different kind of thing. */
                  className={`rounded-field px-2.5 py-1 text-xs font-bold text-dark-teal ${
                    genre === ALL_GENRES ? 'bg-emerald-green/20' : 'bg-pale-blue'
                  }`}
                >
                  {GENRE_LABELS[genre]}
                </span>
              ))}

              {/* The levels, last in the same run of chips and told apart by ink
                  rather than by position: cyan where the genres are dark teal.
                  They used to sit at the far end of the row behind a glyph,
                  which the design drops — on a card this narrow a right-aligned
                  chip wrapped often enough that the "opposite edges" it was
                  arranged for were rarely both there. */}
              {levels.map((level) => (
                <span
                  key={level}
                  className="rounded-field bg-pale-blue px-2.5 py-1 text-xs font-bold text-cyan-blue"
                >
                  {SKILL_LEVEL_LABELS[level]}
                </span>
              ))}
            </div>

            {/* mt-auto is what makes a grid of cards line their buttons up: the
                titles above run to one line or two, and without this the button
                floats up under the short ones. It collapses to nothing on the
                tall cards, though, which is what the padding is for — the button
                keeps its gap above even when there is no slack left to
                distribute. */}
            <div className="mt-auto pt-3">
              {/* A `<span>` wearing `.btn`, because the card around it is
                  already the link. It is the affordance, not the control — so no
                  `aria-label` and nothing focusable: a screen reader meets one
                  link named after the session, which is the whole card. */}
              {/* Spelled out rather than `btn-primary`: the page's blue is the
                  royal blue of the bookings palette, and daisyUI has no slot
                  for it — `primary` is still the site's indigo everywhere else.

                  It empties out to an outline on hover, the same move the band
                  at the foot of the page makes. The border is there at rest in
                  the fill's own colour, so gaining a visible edge doesn't change
                  the button's height and shift the card under it.

                  `group-hover` rather than `hover`: the entire card is one link,
                  so pointing anywhere on it should light the thing that says
                  what clicking does — a button that only answers the pointer
                  over its own 40 pixels reads as the one clickable part of a
                  card that is clickable all over. */}
              <span className="btn w-full gap-2 border-royal-blue bg-royal-blue font-bold text-white transition-colors group-hover:bg-transparent group-hover:text-royal-blue">
                {cta}
                <FaArrowRight aria-hidden className="size-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}
