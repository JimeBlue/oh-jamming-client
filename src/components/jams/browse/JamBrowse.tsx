'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FaPlugCirclePlus } from 'react-icons/fa6';

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

export default function JamBrowse({ initialQuery }: { initialQuery?: string }) {
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

  /* The home page has the same box and no list to put results in, so it sends
     the sentence here unread. Arriving with one means the page is already
     mid-search on its first render — which is why both flags below start from
     it rather than from a hardcoded false. */
  const arrivedWithQuery = initialQuery !== undefined && initialQuery.trim() !== '';

  const [isSearching, setIsSearching] = useState(arrivedWithQuery);
  const [searchError, setSearchError] = useState<string | null>(null);

  /* True only between mount and that sentence being read. The list effect below
     sits still while it is up, because the first request is the search's to
     make: fetching the unfiltered board first would draw every upcoming night
     and then replace it with the four that match — a page that visibly answers
     the wrong question before answering the right one. */
  const [readingInitialQuery, setReadingInitialQuery] = useState(arrivedWithQuery);

  useEffect(() => {
    if (readingInitialQuery) return;

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
  }, [filters, readingInitialQuery]);

  /* The request itself, with every state write in a callback rather than in the
     function body. That split is what lets the effect below start a search at
     all: "searching, and forget the last error" is a synchronous setState, which
     is the one thing an effect must not do — and on arrival there is nothing to
     say, because it is what the initial state already says.

     `useCallback` so the effect can depend on it honestly rather than silence
     the rule; everything it closes over is a setter or a module-level function. */
  const readQuery = useCallback(
    (query: string) =>
      searchJams(query)
        .then((result) => {
          setReading(result);
          setState({ status: 'loading' });
          /* Nothing to filter by when the sentence wasn't a search — the API
             already returns empty filters there, and this makes that explicit
             rather than relying on it. The board stays whole and the message
             says why.

             A fresh object every time, including when the filters are identical
             to the ones in force: searching the same thing twice should visibly
             re-run rather than look like a dead button. */
          setFilters(result.understood ? { ...result.filters } : {});
        })
        .catch((error: unknown) => setSearchError(searchErrorMessage(error)))
        .finally(() => setIsSearching(false)),
    [],
  );

  const runSearch = (query: string) => {
    setIsSearching(true);
    setSearchError(null);
    void readQuery(query);
  };

  /* The home page's sentence, read once on arrival.

     No cleanup flag: unlike the list, a search that lands late can't show the
     wrong thing — `setFilters` is what draws the board, and the effect above
     already drops a stale list response. `readingInitialQuery` is lowered
     whatever the outcome, so a 429 or a dead model leaves the whole board on
     screen with the reason above it rather than an empty page.

     It never runs twice: the flag it guards on is only ever lowered, so editing
     the sentence in the bar re-searches through `onSearch` rather than here. */
  useEffect(() => {
    if (!readingInitialQuery || initialQuery === undefined) return;

    void readQuery(initialQuery.trim()).finally(() => setReadingInitialQuery(false));
  }, [readingInitialQuery, initialQuery, readQuery]);

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
      {/* The eyebrow the cyan band on the home page wears, in the same cyan:
          both are a word above a heading saying which slice of the board is
          below it, and they should be recognisable as the same device. */}
      <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-cyan-blue">
        Upcoming
      </p>

      <h1 className="mt-3 font-display text-4xl font-bold text-dark-teal sm:text-5xl">
        All jam sessions
      </h1>

      <p className="mt-4 max-w-xl text-dark-teal/80">
        Every night still to come, soonest first. Pick one, pick a slot, bring
        your instrument.
      </p>

      <JamSearch
        initialQuery={initialQuery}
        onSearch={runSearch}
        isSearching={isSearching}
        filters={filters}
        onFiltersChange={changeFilters}
        onReset={clearSearch}
      />

      {searchError && (
        <div
          role="alert"
          className="mt-8 rounded-box border border-error/40 bg-error/5 px-4 py-3 text-sm"
        >
          {searchError}
        </div>
      )}

      {/* The reading, above the heading it changes the meaning of. A musician who
          searched is looking at a filtered board and has to be told so — an
          unannounced subset of the list is the failure that looks like missing
          data rather than like a filter. */}
      {reading && !searchError && (
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-box border border-cyan-blue/40 bg-cyan-blue/10 px-4 py-3 text-dark-teal">
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

      {state.status === 'loading' && (
        <div className="flex justify-center py-24">
          <span className="loading loading-spinner loading-lg text-cyan-blue" />
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
            <div className="mt-8 grid place-items-center rounded-box border border-dashed border-cyan-blue/30 bg-base-100 p-10 text-center">
              <p className="font-heading text-xl text-dark-teal">Nothing matches that search</p>

              <p className="mt-2 text-sm text-dark-teal/80">
                No upcoming night fits all of it. Try a wider date, drop the city,
                or start again from the whole board.
              </p>

              <button
                type="button"
                onClick={clearSearch}
                className="btn mt-6 border-0 bg-royal-blue font-bold text-white hover:bg-royal-blue/90"
              >
                Show every jam
              </button>
            </div>
          ) : (
            <div className="mt-8 grid place-items-center rounded-box border border-dashed border-cyan-blue/30 bg-base-100 p-10 text-center">
              <p className="font-heading text-xl text-dark-teal">No jam sessions coming up</p>

              <p className="mt-2 text-sm text-dark-teal/80">
                Nothing is on the board right now. If you run a room, yours could
                be the first.
              </p>

              {/* The one CTA on an empty browse, and it is aimed at venues on
                  purpose: a musician reading this has nothing to do here, and
                  the only thing that fills the page is somebody posting a
                  night. */}
              <Link
                href="/jams/new"
                className="btn mt-6 gap-2 border-0 bg-royal-blue font-bold text-white hover:bg-royal-blue/90"
              >
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
