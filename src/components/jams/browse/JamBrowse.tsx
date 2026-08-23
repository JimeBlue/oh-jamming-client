'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaPlugCirclePlus } from 'react-icons/fa6';

import {
  QUERY_PARAM,
  browseSearch,
  readFilters,
  readPage,
} from '@/lib/jamBrowseParams';
import type { JamSession } from '@/schemas/jamSession';
import { searchJams } from '@/services/ai';
import { ApiError } from '@/services/api';
import { PAGE_SIZE, type JamSessionQuery, getJamSessions } from '@/services/jamSessions';
import JamCard from './JamCard';
import JamPagination from './JamPagination';
import JamSearch from './JamSearch';

/* Every published jam a musician can still turn up to.

   A client component, and not for the usual reason — this list is public, so
   nothing here needs the session cookie. It is client-side because of what the
   bar above it does: search, genre, date and sort all re-run the request.

   **The URL is the state.** Which filters are in force and which page is on
   screen both live in the query string, and this component holds neither — it
   reads them on every render and navigates to change them. That is what makes
   the back button step through pages rather than out of the page, and what makes
   a link someone sends open on the night they were looking at. It also deletes a
   whole class of bug: with nothing mirrored in React state there is no second
   copy to fall out of step with the address bar, and a filter change and a
   history pop take the same path through the code.

   No sorting or filtering of its own. The API already answers active-only, today
   onwards, soonest first (JS12/JS13) — the opposite of the board, which sorts
   itself in `BackstageBoard` because there the API deliberately has no opinion.
   Here it does, and re-sorting a list that arrived in the right order is a second
   answer waiting to disagree with the first. */

/* Three states, not two — same shape as `BackstageBoard` and `AuthContext`.
   Collapsing loading into an empty list means every visitor meets "no jams yet"
   for a beat before the grid appears under it.

   `ready` carries the page's own numbers rather than just the sessions: `total`
   is what the pager is drawn from, and it is a fact about the *filters* rather
   than about the twelve cards on screen. */
type BrowseState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; sessions: JamSession[]; total: number; page: number; limit: number };

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [state, setState] = useState<BrowseState>({ status: 'loading' });
  const [searchError, setSearchError] = useState<string | null>(null);

  /* Seeded from the URL by a lazy initialiser rather than set by the effect that
     reads the sentence. Arriving with `?q=` means the page is already mid-search
     on its first render, and the alternative — an effect setting this to true on
     mount — is the synchronous setState in an effect body that React lints
     against, for one visible change. */
  const [isSearching, setIsSearching] = useState(
    () => searchParams.get(QUERY_PARAM) !== null,
  );

  /* The whole query string as one primitive, which is what the effects below
     depend on. `searchParams` is a fresh object on every render, so depending on
     it directly would re-fetch the list on renders that changed nothing. */
  const search = searchParams.toString();

  /* The sentence typed on the home page, which has the same box and no list to
     put results in. It arrives unread — `POST /ai/search` is called here, next
     to the board it narrows. */
  const query = searchParams.get(QUERY_PARAM);

  /* Rebuilt from the string rather than read off the hook's object, so this
     memo depends on the same primitive the effects do. Both readers sanitise:
     the query string is hand-editable and arrives from other people's links. */
  const filters = useMemo(() => readFilters(new URLSearchParams(search)), [search]);
  const page = useMemo(() => readPage(new URLSearchParams(search)), [search]);

  /* Scrolled to when the page changes. Page 2 arriving under a scroll position
     halfway down page 1 is a reader looking at the middle of a list they have
     not seen the start of. `scroll-mt-32` on the element clears the fixed
     header, which overlays everything in `(site)`. */
  const resultsRef = useRef<HTMLDivElement>(null);

  /* Every change to what is on screen goes through here, and it owns the spinner
     as well as the navigation. The two belong together because of the case that
     looks like a no-op and isn't: searching the same sentence twice, or clicking
     the page you are already on, produces the URL that is already in the address
     bar. Nothing navigates, so the list effect never re-runs — and a `loading`
     set by the caller before calling this would then never be cleared. A stuck
     spinner over a perfectly good board.

     So the comparison is here, once, rather than at four call sites that would
     each have to remember it. */
  const go = useCallback(
    (nextFilters: JamSessionQuery, nextPage: number, mode: 'push' | 'replace' = 'push') => {
      const next = browseSearch(nextFilters, nextPage);

      if (next === search) return;

      setState({ status: 'loading' });

      /* `scroll: false` because Next's default is to jump to the top of the
         document on navigation, and most callers here don't want that — changing
         a filter should leave the reader looking at the bar they just used. The
         page buttons scroll deliberately, in their own handler. */
      router[mode](next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [router, pathname, search],
  );

  /* The sentence, read once and then removed from the URL.
   *
   * Replacing rather than pushing, and replacing with the *filters it was
   * understood to mean* rather than with the sentence: a reload then costs no AI
   * call, the back button doesn't step onto a URL that would spend another one,
   * and what the model decided is written down in the address bar where the
   * Manual tab's controls can show it and correct it one field at a time.
   *
   * The ref guards the request, not the effect. `q` leaves the URL as a result
   * of the work this effect does, so without it a slow round trip could see a
   * second render with `q` still present and fire the model twice for one
   * sentence — two charges against a shared daily quota for one answer.
   */
  const consumedQuery = useRef(false);

  useEffect(() => {
    if (!query || consumedQuery.current) return;

    consumedQuery.current = true;

    searchJams(query.trim())
      .then((result) => {
        /* Nothing to filter by when the sentence wasn't a search — the API
           already returns empty filters there. The board stays whole. */
        go(result.understood ? result.filters : {}, 1, 'replace');
      })
      .catch((error: unknown) => {
        setSearchError(searchErrorMessage(error));

        /* The URL is cleared even on failure, and it has to be: `q` is what
           holds the list effect below still. Leaving it there would answer a
           dead model with a permanent spinner instead of the whole board and an
           error above it. */
        go({}, 1, 'replace');
      })
      .finally(() => setIsSearching(false));
  }, [query, go]);

  /* The list. Re-runs whenever the query string changes — a filter, a page, or
     the back button, all through the same door. */
  useEffect(() => {
    /* The sentence hasn't been read yet, and the filters it produces are about
       to change this URL. Fetching now would draw every upcoming night and then
       replace it with the four that match — a page that visibly answers the
       wrong question before answering the right one. */
    if (query) return;

    /* Cleared by the cleanup: someone who pages quickly would otherwise have the
       first response land after the second and win. */
    let active = true;

    /* Deliberately no `setState({ status: 'loading' })` here. It is the obvious
       line to write and React lints against it — a synchronous setState in an
       effect body renders twice for one visible change. The handlers below set
       it next to the navigation that causes this to re-run, which is where the
       decision actually is. The initial value covers first mount, and a history
       pop keeps the old list on screen until the new one lands rather than
       flashing a spinner between two states the reader already had. */
    getJamSessions(filters, { page, limit: PAGE_SIZE })
      .then((result) => {
        if (!active) return;

        setState({
          status: 'ready',
          sessions: result.items,
          /* The server's numbers, not the ones asked for — they differ whenever
             a default filled one in, and the pager should draw what actually
             happened. */
          total: result.total,
          page: result.page,
          limit: result.limit,
        });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: asMessage(error) });
      });

    return () => {
      active = false;
    };
  }, [query, filters, page]);

  const runSearch = (sentence: string) => {
    setSearchError(null);
    setIsSearching(true);

    searchJams(sentence)
      .then((result) => go(result.understood ? result.filters : {}, 1))
      /* The board on screen is still a valid answer to the last thing asked, so
         a failed reading leaves it alone and only puts the message above it. */
      .catch((error: unknown) => setSearchError(searchErrorMessage(error)))
      .finally(() => setIsSearching(false));
  };

  /* Whether the board below is a subset. Read off the filters actually in force
     rather than off what the AI said, because a sentence it understood but could
     express no filter for — "a friendly jam" — leaves the board whole. */
  const hasFilters = Object.keys(filters).length > 0;

  /* Any change to the controls goes back to page 1. Staying on page 5 while the
     filters narrow to two results is an empty page that looks like no matches —
     the commonest bug in a paginated list, and the reason this is one function
     rather than a rule to remember at three call sites. */
  const changeFilters = (next: JamSessionQuery) => {
    setSearchError(null);
    go(next, 1);
  };

  const clearSearch = () => {
    setSearchError(null);
    go({}, 1);
  };

  const changePage = (next: number) => {
    go(filters, next);

    /* After the navigation, not before: the results block is about to be
       replaced, and scrolling to where it currently sits is the same place. */
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        initialQuery={query ?? undefined}
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

      <div ref={resultsRef} className="scroll-mt-32">
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
            /* Three different empty boards, and they are not the same news.

               A page past the end is the one paging added, and it is the only
               one where the board is fine and the *address* is wrong — someone
               following an old link, or editing the number by hand. It says so
               and offers the way back, because `total` proves there is one. */
            state.total > 0 ? (
              <div className="mt-8 grid place-items-center rounded-box border border-dashed border-cyan-blue/30 bg-base-100 p-10 text-center">
                <p className="font-heading text-xl text-dark-teal">
                  There&apos;s no page {state.page}
                </p>

                <p className="mt-2 text-sm text-dark-teal/80">
                  {state.total === 1
                    ? 'There is one jam session matching this search.'
                    : `There are ${state.total} jam sessions matching this search.`}{' '}
                  Start from the beginning.
                </p>

                <button
                  type="button"
                  onClick={() => changePage(1)}
                  className="btn mt-6 border-0 bg-royal-blue font-bold text-white hover:bg-royal-blue/90"
                >
                  Back to page 1
                </button>
              </div>
            ) : /* A filtered empty board means this search found nothing, the
                   board behind it is full, and the only useful control is the
                   one that gives it back. Showing the venue CTA here would
                   answer a musician's empty search by suggesting they open a
                   bar. */
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
              /* An unfiltered one means the platform has nothing on it, and the
                 only thing that fixes it is a venue posting a night. */
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

              <JamPagination
                page={state.page}
                total={state.total}
                limit={state.limit}
                onPageChange={changePage}
              />
            </>
          ))}
      </div>
    </>
  );
}
