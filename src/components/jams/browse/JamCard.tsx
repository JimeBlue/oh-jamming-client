import Image from 'next/image';
import Link from 'next/link';
import { FaLocationDot, FaRegClock, FaRegImage, FaTicket } from 'react-icons/fa6';

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

/* The eight hover zones daisyUI's `hover-3d` reads. They are children 2–9 of the
   container, laid over the card in a 3×3 grid with the middle cell left out, and
   which one the pointer is in is the entire input to the effect: the component
   selects on `:has(> :nth-child(n):hover)` and sets the tilt, the shine position
   and the shadow offset from it. Empty and `aria-hidden` — there is nothing in
   them to read, and their only job is to be somewhere the pointer can be. */
const HOVER_ZONES = [0, 1, 2, 3, 4, 5, 6, 7];

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

          THE LINK IS ALSO THE `hover-3d` CONTAINER, and it has to be. The zones
          above sit over the card with a z-index of their own, so beside the link
          they would swallow every click outside the middle third of it — and a
          link laid over them would mean the pointer never reaches a zone, so
          nothing would ever tilt. Making the link the container resolves both:
          the zones are inside the anchor, so a click on one still navigates.

          `h-full w-full` because `hover-3d` sets `display: inline-grid`, which
          on its own shrinks the card to its content and leaves it short of the
          row height its neighbours stretch to. */}
      <Link
        href={`/jams/${session.id}`}
        aria-label={session.title}
        className="hover-3d h-full w-full"
      >
        {/* The first child is the one daisyUI tilts, so everything visible lives
            in here rather than on the link. `relative` for the shine, which the
            component paints as an absolutely positioned `::before` on this
            element; the clipping that rounds the corners is the component's own
            `overflow: hidden`. */}
        <div className="relative flex h-full flex-col rounded-box bg-base-100 shadow-lg">
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
                className="object-cover"
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
              {/* The first two only, and silently — every genre on a card this
                  wide wraps into three rows and pushes the button off the fold,
                  and a musician filtering by genre already knows which one they
                  asked for. */}
              {session.genres.slice(0, 2).map((genre) => (
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

              {/* The level, last in the same run of chips and told apart by ink
                  rather than by position: cyan where the genres are dark teal.
                  It used to sit at the far end of the row behind a glyph, which
                  the design drops — on a card this narrow two genres and a
                  right-aligned third chip wrapped often enough that the
                  "opposite edges" it was arranged for were rarely both there.

                  The first only, like the genres: a session tagged for two
                  levels is rare, and the space here is one pill wide. */}
              {level && (
                <span className="rounded-field bg-pale-blue px-2.5 py-1 text-xs font-bold text-cyan-blue">
                  {SKILL_LEVEL_LABELS[level]}
                </span>
              )}
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

                  The ticket leads the words instead of an arrow trailing them.
                  An arrow at the far edge said "there is more page this way",
                  which is true of the card as a whole; the ticket says what the
                  click is for, which is the thing worth saying twice on a grid
                  of twelve. */}
              <span className="btn w-full gap-2 border-0 bg-royal-blue font-bold text-white hover:bg-royal-blue/90">
                <FaTicket aria-hidden className="size-4" />
                {cta}
              </span>
            </div>
          </div>
        </div>

        {HOVER_ZONES.map((zone) => (
          <div key={zone} aria-hidden />
        ))}
      </Link>
    </li>
  );
}
