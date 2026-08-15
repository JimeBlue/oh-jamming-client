'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaPlugCirclePlus } from 'react-icons/fa6';

import blueRayas from '@/assets/blue-rayas.png';
import type { JamSession } from '@/schemas/jamSession';
import { ApiError } from '@/services/api';
import { getJamSessions } from '@/services/jamSessions';
import JamCard from './JamCard';
import JamPagination from './JamPagination';

/* Every published jam a musician can still turn up to.

   A client component, and not for the usual reason — this list is public, so
   nothing here needs the session cookie. It is client-side because of what comes
   next: search, genre, date and sort all live in this bar, and every one of them
   re-runs the request. Fetching on the server would mean the first render is the
   only one that isn't a round trip through a URL.

   No sorting or filtering of its own. The API already answers active-only, today
   onwards, soonest first (JS12/JS13) — the opposite of the board, which sorts
   itself in `BackstageBoard` because there the API deliberately has no opinion.
   Here it does, and re-sorting a list that arrived in the right order is a second
   answer waiting to disagree with the first. */

/* Three states, not two — same shape as `BackstageBoard` and `AuthContext`.
   Collapsing loading into an empty list means every visitor meets "no jams yet"
   for a beat before the grid appears under it. */
type BrowseState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; sessions: JamSession[] };

const asMessage = (error: unknown): string =>
  error instanceof ApiError
    ? error.message
    : 'Something went wrong. Please try again.';

export default function JamBrowse() {
  const [state, setState] = useState<BrowseState>({ status: 'loading' });

  useEffect(() => {
    /* Cleared by the cleanup: someone who clicks away mid-request would
       otherwise get a setState on an unmounted component when it lands. */
    let active = true;

    getJamSessions()
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

  return (
    <>
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-3xl sm:text-4xl">All jam sessions</h1>

        {/* Decorative, so `alt=""` and nothing else — the heading beside it is
            already the page's name, and a scribble with a description would just
            make a screen reader read the title twice.

            Static import, which is what gives next/image the intrinsic size and
            keeps the line from jumping once the file lands. Height set off the
            heading with `w-auto` so the 2:1 artwork keeps its proportions at
            both breakpoints. */}
        <Image src={blueRayas} alt="" priority className="h-6 w-auto sm:h-8" />
      </div>

      <p className="mt-2 max-w-2xl">
        Every night still to come, soonest first. Pick one, pick a slot, bring
        your instrument.
      </p>

      {state.status === 'loading' && (
        <div className="flex justify-center py-24">
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="sr-only">Loading jam sessions</span>
        </div>
      )}

      {state.status === 'error' && (
        <div
          role="alert"
          className="mt-8 rounded-box border border-error/40 bg-error/5 p-6 text-center"
        >
          <p className="font-bold">The jam sessions couldn&apos;t be loaded</p>
          <p className="mt-1 text-sm opacity-80">{state.message}</p>
        </div>
      )}

      {state.status === 'ready' &&
        (state.sessions.length === 0 ? (
          <div className="mt-8 grid place-items-center rounded-box border border-dashed border-base-300 bg-base-100 p-10 text-center">
            <p className="font-heading text-xl">No jam sessions coming up</p>

            <p className="mt-2 text-sm text-base-content/80">
              Nothing is on the board right now. If you run a room, yours could
              be the first.
            </p>

            {/* The one CTA on an empty browse, and it is aimed at venues on
                purpose: a musician reading this has nothing to do here, and the
                only thing that fills the page is somebody posting a night. */}
            <Link href="/jams/new" className="btn btn-primary mt-6 gap-2 font-bold">
              <FaPlugCirclePlus className="size-5" />
              Insert your Jam
            </Link>
          </div>
        ) : (
          <>
            {/* Four across at the widest, which is where the 7xl container tops
                out — past `xl` the page stops growing, so a fifth column would
                only make four cards narrower rather than fit more in.
                `items-stretch` is the default and is what lets them match
                heights so the buttons line up — see `mt-auto` in JamCard. */}
            <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {state.sessions.map((session) => (
                <JamCard key={session.id} session={session} />
              ))}
            </ul>

            <JamPagination />
          </>
        ))}
    </>
  );
}
