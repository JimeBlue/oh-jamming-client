'use client';

import {
  FaEye,
  FaLocationDot,
  FaPenToSquare,
  FaRegCalendar,
} from 'react-icons/fa6';

import { formatListingDate } from '@/lib/jamListing';
import { canCancelJam, jamStatus } from '@/lib/jamStatus';
import { utcMidnightToDateString } from '@/lib/time';
import type { JamSession } from '@/schemas/jamSession';
import JamStatusBadge from './JamStatusBadge';
import JamThumbnail from './JamThumbnail';

/* One night on the venue's board.

   The layout is one wrapping flex row rather than two layouts behind a
   breakpoint: thumbnail, details, badge and actions all sit on one line once
   there is room, and below that the actions take a full-width row of their own
   because `w-full lg:w-auto` is the only thing that forces the wrap. Two
   separately-written layouts would be two places to fix every future change. */
export default function BackstageRow({
  session,
  onCancel,
}: {
  session: JamSession;
  onCancel: () => void;
}) {
  const status = jamStatus(session);
  const when = formatListingDate(utcMidnightToDateString(session.date));

  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-base-200 px-4 py-6 last:border-b-0 sm:gap-5 sm:px-6 sm:py-8">
      <JamThumbnail image={session.image} />

      {/* The 12rem basis is what decides the mobile layout, and it is a choice
          rather than a leftover. A wrapping flex row breaks on base widths
          before anything shrinks, so this asks for 12rem and pushes the badge to
          a line of its own at 375px — where thumbnail, title and badge genuinely
          do not fit together. Dropping to `basis-0` keeps all three on one line
          and buys it by truncating "Tonight at the Kellerei" to "Tonight at …",
          which is the one thing on the row a venue is scanning for. From `sm` up
          there is room for both and the wrap stops happening on its own.

          min-w-0 is the other half: a flex item defaults to min-width:auto and
          refuses to shrink below its content, which is how a long title shoves
          the badge off the row instead of truncating. */}
      <div className="min-w-0 flex-1 basis-48">
        <h3 className="truncate font-heading text-lg sm:text-xl">
          {session.title}
        </h3>

        <p className="mt-1 flex items-center gap-2 text-sm text-base-content/80">
          <FaLocationDot aria-hidden className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">{session.venueName}</span>
        </p>

        {when && (
          <p className="mt-1 flex items-center gap-2 text-sm text-base-content/80">
            <FaRegCalendar aria-hidden className="size-3.5 shrink-0 text-primary" />
            <span>
              {when} at {session.startTime}
            </span>
          </p>
        )}
      </div>

      {/* A column, not just a badge. Left to itself the badge is a shrink-to-fit
          flex item packed against the buttons, so its left edge moves with the
          width of the word inside it — "Today" started 44px right of "Upcoming"
          on the row above. The fixed width from `lg` is what puts every badge on
          one vertical line under the Status heading; the heading reserves the
          same 10rem, which is what keeps the two in step. */}
      <div className="lg:w-40">
        <JamStatusBadge status={status} />
      </div>

      {/* `disabled:pointer-events-auto` on the two that can be switched off, and
          it is what makes `cursor-not-allowed` show at all: daisyUI sets
          `pointer-events: none` on every disabled `.btn`, so the pointer never
          meets the button and takes its cursor from the row underneath instead.
          Handing the events back costs nothing — a disabled button doesn't fire
          a click either way — and it is the only way the cursor can report that
          the control is off before someone tries it. */}
      {/* Between `sm` and `lg` the actions are on a row of their own and would
          otherwise start under the thumbnail, in a column nothing else uses.
          Indented instead to where the venue name and date start: 5rem of
          thumbnail plus the row's own 1.25rem gap. Padding rather than margin so
          it stays inside `w-full` — a margin would push the row wider than the
          card. Left alone below `sm`, where the gap is 1rem and the shorter
          indent isn't worth the arithmetic, and reset at `lg` where this stops
          being a row and becomes the third column. */}
      <div className="flex w-full items-center gap-2 sm:pl-25 lg:w-48 lg:pl-0">
        {/* Live controls with nowhere to go yet — /jams/[id] and the edit route
            don't exist. Left enabled rather than disabled so the row is already
            the row it will be, and adding an href later moves nothing. */}
        <button
          type="button"
          aria-label={`View ${session.title}`}
          className="btn btn-square btn-outline btn-primary"
        >
          <FaEye className="size-5" />
        </button>

        {/* Off on a night that has already run, and off on a cancelled one too.
            The second half isn't in the design but is in the API: `PATCH
            /jam-sessions/:id` answers 409 on a cancelled session, because
            editing a tombstone has no meaning and allowing it would be the one
            route that looked like un-cancelling. An enabled pencil there leads
            to a guaranteed error, which is a worse answer than a dimmed one. */}
        <button
          type="button"
          disabled={status === 'past' || status === 'cancelled'}
          aria-label={`Edit ${session.title}`}
          className="btn btn-square btn-outline btn-primary disabled:pointer-events-auto disabled:cursor-not-allowed disabled:border-base-300 disabled:bg-transparent disabled:text-base-content/40"
        >
          <FaPenToSquare className="size-5" />
        </button>

        {/* Worded, where the other two are glyphs. Not an inconsistency: those
            two go somewhere and come back, while this one calls off a night and
            emails nobody — the destructive action is the one that should have to
            be read rather than recognised.

            Nothing explains the disabled state, because the badge two inches
            away already does: a row that says "Past" or "Cancelled" is not
            ambiguous about why it can't be cancelled again. */}
        <button
          type="button"
          onClick={onCancel}
          disabled={!canCancelJam(session)}
          /* Names the session, and still opens with the visible word, which is
             what keeps voice control working — "click Cancel" has to match. */
          aria-label={`Cancel ${session.title}`}
          /* Not `btn-error`: that red belongs to form validation, and this pink
             is the brand's own. Spelled out rather than themed because daisyUI
             has no slot for "a fifth button colour" — the token is still the one
             in globals.css, so the hex lives in exactly one place.

             Every one of them behind `enabled:`, which is the whole fix for a
             disabled button that stayed pink: daisyUI greys a disabled `.btn`
             through `:disabled`, and a plain `text-status-cancelled` matches on
             specificity and wins on source order. Gated this way there is
             nothing to lose the argument with — the greying is simply what is
             left, so a disabled Cancel looks like the disabled pencil beside it
             rather than like a live control that ignores clicks. */
          className="btn btn-outline font-bold enabled:border-status-cancelled enabled:text-status-cancelled enabled:hover:border-status-cancelled enabled:hover:bg-status-cancelled enabled:hover:text-white disabled:pointer-events-auto disabled:cursor-not-allowed disabled:border-base-300 disabled:bg-transparent disabled:text-base-content/40"
        >
          Cancel
        </button>
      </div>
    </li>
  );
}
