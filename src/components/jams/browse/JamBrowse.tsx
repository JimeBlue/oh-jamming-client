'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaPlugCirclePlus } from 'react-icons/fa6';

import blueRayas from '@/assets/blue-rayas.png';
import type { JamSession } from '@/schemas/jamSession';
import { type AiSearchResult, searchJams } from '@/services/ai';
import { ApiError } from '@/services/api';
import { type JamSessionQuery, getJamSessions } from '@/services/jamSessions';
import JamCard from './JamCard';
import JamPagination from './JamPagination';
import JamSearch from './JamSearch';

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

/* Every one of these leaves the musician somewhere to go, because there always
   is somewhere: the board below has been there since before the search existed
   and needs no model, no network and no quota. A search that fails costs the
   click and nothing else. */
const searchErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) {
    return 'That didn’t reach the server. Check your connection and try again.';
  }

  if (error.status === 503) {
    return 'AI search isn’t available right now. Everything still to come is below.';
  }

  /* 429 from the rate limiter or the shared daily quota, 502 from the model
     itself. The API writes a usable sentence for each, and repeating it here
     would only give the two a way to drift apart. */
  return error.message;
};

export default function JamBrowse() {
  const [state, setState] = useState<BrowseState>({ status: 'loading' });

  /* The filters the list is currently drawn from. A separate piece of state from
     the reading below rather than a field on it, because it is the only one the
     fetch depends on — the explanation and the ignored parts are things to say
     about a request, not inputs to it, and having them in the dependency list
     would re-fetch every time the wording changed. */
  const [filters, setFilters] = useState<JamSessionQuery>({});

  /* What the AI made of the last sentence, or null when nobody has searched.
     Null and "understood nothing" are different states: one shows the plain
     board, the other has something to explain. */
  const [reading, setReading] = useState<AiSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    /* Cleared by the cleanup: someone who searches twice quickly would otherwise
       have the first response land after the second and win. */
    let active = true;

    /* Deliberately no `setState({ status: 'loading' })` here. It is the obvious
       line to write and React lints against it — a synchronous setState in an
       effect body renders twice for one visible change. The two handlers below
       set it instead, next to the `setFilters` that causes this to re-run, which
       is where the decision actually is. The initial value covers first mount. */
    getJamSessions(filters)
      .then((sessions) => {
        if (active) setState({ status: 'ready', sessions });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: asMessage(error) });
      });

    return () => {
      active = false;
    };
  }, [filters]);

  const runSearch = async (query: string) => {
    setIsSearching(true);
    setSearchError(null);

    try {
      const result = await searchJams(query);

      setReading(result);
      setState({ status: 'loading' });
      /* Nothing to filter by when the sentence wasn't a search — the API already
         returns empty filters there, and this makes that explicit rather than
         relying on it. The board stays whole and the message says why.

         A fresh object every time, including when the filters are identical to
         the ones in force: searching the same thing twice should visibly re-run
         rather than look like a dead button. */
      setFilters(result.understood ? { ...result.filters } : {});
    } catch (error) {
      setSearchError(searchErrorMessage(error));
    } finally {
      setIsSearching(false);
    }
  };

  /* Whether the board below is a subset. Read off the filters actually in force
     rather than off `reading`, because a sentence the AI understood but could
     express no filter for — "a friendly jam" — leaves the board whole. */
  const hasFilters = Object.keys(filters).length > 0;

  /* A hand-made change to any one control. The reading goes with it: "Beginner
     jazz nights this weekend" stops describing the board the moment somebody
     changes the city underneath it, and a sentence that no longer matches what
     is on screen is worse than no sentence — it is the page telling the reader
     something untrue about itself. */
  const changeFilters = (next: JamSessionQuery) => {
    setReading(null);
    setSearchError(null);
    setState({ status: 'loading' });
    setFilters(next);
  };

  const clearSearch = () => {
    setReading(null);
    setSearchError(null);
    setState({ status: 'loading' });
    setFilters({});
  };

  return (
    <>
      <JamSearch
        onSearch={runSearch}
        isSearching={isSearching}
        filters={filters}
        onFiltersChange={changeFilters}
        onReset={clearSearch}
      />

      {searchError && (
        <div
          role="alert"
          className="mb-8 rounded-box border border-error/40 bg-error/5 px-4 py-3 text-sm"
        >
          {searchError}
        </div>
      )}

      {/* The reading, above the heading it changes the meaning of. A musician who
          searched is looking at a filtered board and has to be told so — an
          unannounced subset of the list is the failure that looks like missing
          data rather than like a filter. */}
      {reading && !searchError && (
        <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-box border border-primary/40 bg-primary/10 px-4 py-3">
          <p className="text-sm">
            {reading.understood ? (
              <>
                Showing: <span className="font-bold">{reading.explanation}</span>
              </>
            ) : (
              reading.explanation
            )}
          </p>

          {/* Said plainly rather than swallowed. These are the parts of the
              sentence the filters can't express — an instrument, "with spots
              left" — and a search that quietly drops them answers a different
              question than the one asked. */}
          {reading.ignored.length > 0 && (
            <p className="text-sm opacity-70">
              Couldn&apos;t filter by: {reading.ignored.join(', ')}
            </p>
          )}

          {/* No Clear of its own. Reset lives in the bar above and undoes both
              tabs; a second control here would be a third way to do the same
              thing, and the one furthest from the controls it resets. */}
        </div>
      )}

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
          /* Two different empty boards, and they are not the same news. An
             unfiltered one means the platform has nothing on it, and the only
             thing that fixes it is a venue posting a night — so it says so, and
             points at the builder. A filtered one means this search found
             nothing, the board behind it is full, and the only useful control is
             the one that gives it back. Showing the venue CTA there would answer
             a musician's empty search by suggesting they open a bar. */
          hasFilters ? (
            <div className="mt-8 grid place-items-center rounded-box border border-dashed border-base-300 bg-base-100 p-10 text-center">
              <p className="font-heading text-xl">Nothing matches that search</p>

              <p className="mt-2 text-sm text-base-content/80">
                No upcoming night fits all of it. Try a wider date, drop the city,
                or start again from the whole board.
              </p>

              <button
                type="button"
                onClick={clearSearch}
                className="btn btn-primary mt-6 font-bold"
              >
                Show every jam
              </button>
            </div>
          ) : (
            <div className="mt-8 grid place-items-center rounded-box border border-dashed border-base-300 bg-base-100 p-10 text-center">
              <p className="font-heading text-xl">No jam sessions coming up</p>

              <p className="mt-2 text-sm text-base-content/80">
                Nothing is on the board right now. If you run a room, yours could
                be the first.
              </p>

              {/* The one CTA on an empty browse, and it is aimed at venues on
                  purpose: a musician reading this has nothing to do here, and
                  the only thing that fills the page is somebody posting a
                  night. */}
              <Link href="/jams/new" className="btn btn-primary mt-6 gap-2 font-bold">
                <FaPlugCirclePlus className="size-5" />
                Insert your Jam
              </Link>
            </div>
          )
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
