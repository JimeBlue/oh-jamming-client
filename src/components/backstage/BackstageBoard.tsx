'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaPlugCirclePlus } from 'react-icons/fa6';

import { nowInAppTimezone, utcMidnightToDateString } from '@/lib/time';
import type { JamSession } from '@/schemas/jamSession';
import { ApiError } from '@/services/api';
import { cancelJamSession, getMyJamSessions } from '@/services/jamSessions';
import BackstageEmpty from './BackstageEmpty';
import BackstageRow from './BackstageRow';
import CancelJamDialog from './CancelJamDialog';

/* Nights still ahead first, soonest first; then the ones already played, most
   recent first. The endpoint hands them over in one chronological run because
   ordering is presentation and the API has no business having an opinion about
   it — this is that opinion.

   Both halves read outwards from today, which is the only arrangement where the
   row a venue opened the page to find is near the top. Straight chronological
   buries tonight's jam in the middle; reverse chronological puts a session eight
   months out above it. Cancelled rows sort by date like any other: a night
   called off next week is still next week's problem. */
const inBoardOrder = (sessions: JamSession[]): JamSession[] => {
  const { date: today } = nowInAppTimezone();
  const dayOf = (session: JamSession) => utcMidnightToDateString(session.date);

  /* Sorting on "YYYY-MM-DD" and "HH:mm" strings directly — both sort
     lexicographically in the same order they sort chronologically, which is why
     lib/time keeps them as strings in the first place. */
  const key = (session: JamSession) => `${dayOf(session)} ${session.startTime}`;

  const ahead = sessions
    .filter((session) => dayOf(session) >= today)
    .sort((a, b) => key(a).localeCompare(key(b)));

  const played = sessions
    .filter((session) => dayOf(session) < today)
    .sort((a, b) => key(b).localeCompare(key(a)));

  return [...ahead, ...played];
};

/* Three states, not two — the same shape as AuthContext and for the same reason.
   "No sessions yet" and "haven't asked yet" look identical if loading collapses
   into an empty list, and the venue would meet the empty state for a moment on
   every load before their board appeared underneath it. */
type BoardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; sessions: JamSession[] };

const asMessage = (error: unknown): string =>
  error instanceof ApiError
    ? error.message
    : 'Something went wrong. Please try again.';

export default function BackstageBoard() {
  const [state, setState] = useState<BoardState>({ status: 'loading' });

  /* The session to cancel, and null for "no dialog". One value rather than a
     boolean beside it — see CancelJamDialog. */
  const [target, setTarget] = useState<JamSession | null>(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    /* Set false by the cleanup below. Without it, a venue who clicks away while
       /jam-sessions/mine is still in flight gets a setState on a component that
       is no longer mounted when it lands. */
    let active = true;

    getMyJamSessions()
      .then((sessions) => {
        if (active) setState({ status: 'ready', sessions });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: asMessage(error) });
      });

    return () => {
      active = false;
    };
  }, []);

  const confirmCancel = async () => {
    if (!target) return;

    setCancelPending(true);
    setCancelError(null);

    try {
      await cancelJamSession(target.id);

      /* Patched locally rather than refetched. A 2xx means exactly one thing
         changed and we already know what it is — the session's status — so
         re-reading the whole board would spend a round trip to be told
         something we could have written down, and blank the list while it did.
         The row stays where it is; only its badge changes. */
      setState((current) =>
        current.status === 'ready'
          ? {
              status: 'ready',
              sessions: current.sessions.map((session) =>
                session.id === target.id
                  ? { ...session, status: 'cancelled' as const }
                  : session,
              ),
            }
          : current,
      );

      setTarget(null);
    } catch (error: unknown) {
      /* Left open, showing why. The API refuses a session that isn't this
         venue's (403) and one whose account has gone stale (401), and both are
         things the venue needs to read rather than guess at from a board that
         didn't change. */
      setCancelError(asMessage(error));
    } finally {
      setCancelPending(false);
    }
  };

  const closeDialog = () => {
    if (cancelPending) return;

    setTarget(null);
    setCancelError(null);
  };

  const sessions = state.status === 'ready' ? state.sessions : [];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl">My backstage</h1>
          {/* `text-base-content/80` rather than `opacity-70`. Both dim text, but
              opacity dims the *element* — every icon inside it goes pale with the
              words — while the alpha modifier only touches the colour. Which
              matters on the rows below, where the pins and calendars are meant
              to stay indigo. Kept the same here so the page has one muted grey
              and not two that nearly match. */}
          <p className="mt-2 text-base-content/80">
            Manage your jam sessions. Check what&apos;s coming up, and call off a
            night if you have to.
          </p>
        </div>

        {/* Hidden while the board is empty, where BackstageEmpty carries the
            only copy of this button, and hidden while loading so it doesn't
            appear a beat before the thing it sits above. */}
        {sessions.length > 0 && (
          <Link
            href="/jams/new"
            className="btn btn-primary shrink-0 gap-2 font-bold"
          >
            <FaPlugCirclePlus className="size-5" />
            Insert your Jam
          </Link>
        )}
      </div>

      {state.status === 'loading' && (
        <div className="mt-8 flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="sr-only">Loading your jam sessions</span>
        </div>
      )}

      {state.status === 'error' && (
        <div
          role="alert"
          className="mt-8 rounded-box border border-error/40 bg-error/5 p-6 text-center"
        >
          <p className="font-bold">Your sessions couldn&apos;t be loaded</p>
          <p className="mt-1 text-sm opacity-80">{state.message}</p>
        </div>
      )}

      {state.status === 'ready' &&
        (sessions.length === 0 ? (
          <BackstageEmpty />
        ) : (
          /* Lifted off the page rather than outlined. The page sits on base-200
             and the board is base-100, so a border was drawing a line between
             two colours that already differed — the shadow is what makes it read
             as a panel resting on the page instead of a region marked out on
             it. */
          <div className="mt-8 overflow-hidden rounded-box bg-base-100 shadow-xl">
            {/* The column headings from the design, and only from lg up — below
                that the rows stop being columns, so a header naming them would
                be labelling something that isn't there. `aria-hidden` because
                the headings are decorative: each row already says its own venue,
                date and status in words. */}
            {/* base-300, not base-200: the page itself is base-200, so a header
                tinted with it was the same colour as the space around the board
                and read as a gap rather than a heading. */}
            {/* Three columns, and the third has no heading — the buttons label
                themselves. It is still declared, as an empty span of the width
                the actions occupy, because that is what holds "Status" over the
                badges: the heading row and every jam row now end with the same
                two fixed widths and the same gap, so their flex-1 columns stop
                at the same x and everything to the right of it lines up. Drop
                the spacer and "Status" slides over the buttons. */}
            <div
              aria-hidden
              className="hidden gap-5 bg-base-300 px-6 py-4 font-bold lg:flex"
            >
              <span className="flex-1">Jam sessions</span>
              <span className="w-40">Status</span>
              <span className="w-48" />
            </div>

            <ul>
              {inBoardOrder(sessions).map((session) => (
                <BackstageRow
                  key={session.id}
                  session={session}
                  onCancel={() => {
                    setCancelError(null);
                    setTarget(session);
                  }}
                />
              ))}
            </ul>
          </div>
        ))}

      <CancelJamDialog
        session={target}
        pending={cancelPending}
        error={cancelError}
        onConfirm={() => void confirmCancel()}
        onClose={closeDialog}
      />
    </>
  );
}
