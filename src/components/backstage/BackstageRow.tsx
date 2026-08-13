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
    <li className="flex flex-wrap items-center gap-4 border-b border-base-200 p-4 last:border-b-0 sm:p-6">
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

        <p className="mt-1 flex items-center gap-2 text-sm opacity-70">
          <FaLocationDot aria-hidden className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">{session.venueName}</span>
        </p>

        {when && (
          <p className="mt-1 flex items-center gap-2 text-sm opacity-70">
            <FaRegCalendar aria-hidden className="size-3.5 shrink-0 text-primary" />
            <span>
              {when} at {session.startTime}
            </span>
          </p>
        )}
      </div>

      <JamStatusBadge status={status} />

      <div className="flex w-full items-center gap-2 lg:w-auto">
        {/* Both of these are off until the pages behind them exist. Rendered
            rather than hidden because the row is the same row either way, and a
            control that appears later moves everything around it; `title` says
            why, so a disabled button isn't just an unexplained dead end. */}
        <button
          type="button"
          disabled
          title="The public session page isn't built yet"
          aria-label={`View ${session.title}`}
          className="btn btn-square btn-outline btn-primary btn-sm"
        >
          <FaEye className="size-4" />
        </button>

        <button
          type="button"
          disabled
          title="Editing a published session isn't built yet"
          aria-label={`Edit ${session.title}`}
          className="btn btn-square btn-outline btn-primary btn-sm"
        >
          <FaPenToSquare className="size-4" />
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
          className="btn btn-outline btn-error btn-sm font-bold"
        >
          Cancel
        </button>
      </div>
    </li>
  );
}
