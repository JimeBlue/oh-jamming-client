import { z } from 'zod';

import {
  jamSessionPageSchema,
  jamSessionSchema,
  type Genre,
  type JamSession,
  type JamSessionPage,
  type JamSessionPayload,
  type SkillLevel,
} from '@/schemas/jamSession';
import { api } from '@/services/api';

/* The jam session endpoints, named for what they do rather than the routes they
   hit — same shape as services/auth.

   Reading is public; writing is venues only. `POST /jam-sessions` runs
   `authenticate` before `requireRole('venue')`, so an anonymous caller gets a
   401 and a musician gets a 403 — two different situations that deserve two
   different messages, which is why the client never collapses them into
   "not allowed". */

/* Returns the created session in full, including the `slots` the API generated
   from the start time, end time and slot length. Nothing client-side has to
   work those out — and nothing client-side should, since a second
   implementation of the slot maths is a second answer waiting to disagree. */
export const createJamSession = (payload: JamSessionPayload): Promise<JamSession> =>
  api.post('/jam-sessions', payload, jamSessionSchema);

/* The browse filters. Every one of them optional, and the set is closed: the
   API's query schema is a `strictObject`, so `?genr=jazz` is a 400 for the whole
   request rather than a filter that quietly does nothing.

   `status` is deliberately not offered. The browse defaults to active, and the
   only other value is `cancelled` — a list of called-off nights is not a thing a
   musician browses for, and the one place that wants them is the venue's own
   board, which has its own endpoint. */
export type JamSessionQuery = {
  genre?: Genre;
  skillLevel?: SkillLevel;
  venueId?: string;
  /* Matched as a case-insensitive substring of the address line, because there
     is no city on the model — the address is one free-text `formatted` string.
     So "Berlin" finds a session on Oranienstraße, and would equally find one on
     a street called Berliner Allee. Accents are literal: "Nurnberg" matches
     nothing that "Nürnberg" matches. */
  city?: string;
  /* "YYYY-MM-DD". Omitted means today onwards (JS13) — the browse answers "what
     can I still turn up to?", so the default is the one worth having. */
  from?: string;
  to?: string;
};

/* Kept out of `JamSessionQuery` on purpose, and the API's schema draws the same
   line: these two say *which slice* of a result set to return, not what belongs
   in it. The distinction earns its keep in `services/ai.ts`, whose whole job is
   turning a sentence into a `JamSessionQuery` — "jazz in Berlin next Friday" has
   no opinion about a page, and a type that made it name one would be modelling
   the search wrong. */
export type JamSessionPaging = {
  /* 1-based, matching the number drawn on the button. */
  page?: number;
  limit?: number;
};

/* How many cards a page of the browse holds. The client's choice, not the API's
   — `GET /jam-sessions` has a default of its own for callers that send no
   `limit`, and this app never is one: `JamBrowse` passes this on every request.
   So the two numbers are free to differ, and changing this one needs no deploy
   on the other side.

   Eight rather than a round twelve because of what the board actually holds. The
   grid is four across at `xl`, so this is two clean rows there — and with nine
   upcoming sessions, twelve would put every one of them on a single page and
   render no pager at all. A control that only appears once the platform grows is
   a control nobody has ever seen work. */
export const PAGE_SIZE = 8;

/* This one *is* the API's, and mirrored rather than chosen: `limit` is validated
   against it server-side, so asking for more is a 400. It bounds
   `getAllJamSessions` below. Duplicated across the two repos, which is the price
   of no shared package — but the failure mode if they drift is a loud 400 rather
   than a silently short list. */
export const MAX_PAGE_SIZE = 48;

/* Every published session a musician can still turn up to: active only, today
   onwards, soonest first.

   Public — no cookie, and none of the three states `AuthContext` has apply here.
   A visitor has to be able to read the board before deciding to register, which
   is why this is the one list in the app that anonymous callers get in full. */
export const getJamSessions = (
  query: JamSessionQuery = {},
  paging: JamSessionPaging = {},
): Promise<JamSessionPage> => {
  const params = new URLSearchParams();

  /* Empty strings dropped along with undefined: a cleared `<select>` reads as
     "", and `?genre=` is an unknown genre to the API rather than no filter. */
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }

  /* Set separately rather than by spreading `paging` into the loop above,
     because `0` is falsy and the loop drops falsy values. Neither is a legal
     value here — the API's floor is 1 for both — so a dropped `0` would quietly
     become "first page, default size" instead of the 400 that says the caller
     computed a page number wrong. */
  if (paging.page !== undefined) params.set('page', String(paging.page));
  if (paging.limit !== undefined) params.set('limit', String(paging.limit));

  const search = params.toString();

  return api.get(
    `/jam-sessions${search ? `?${search}` : ''}`,
    jamSessionPageSchema,
  );
};

/* Every session matching the filters, gathered a page at a time.
 *
 * For the callers that genuinely need the whole board rather than a screenful:
 * the home page's cyan band counts open spots and instrument types across all of
 * it, and a count taken from the first twelve sessions is exactly the kind of
 * number that component exists not to print.
 *
 * `MAX_PAGE_SIZE` per request because the API caps `limit` — since paging
 * landed there is no longer a way to ask for everything in one call, which is
 * the point of the cap and the reason this loop exists at all.
 *
 * Sequential, not parallel: the first response is what says how many more there
 * are. At the size this platform is, that is one request and the loop never
 * runs a second time.
 *
 * The real fix is an aggregate endpoint — `GET /jam-sessions/stats` returning
 * the five numbers the band shows, counted in Mongo. This walks the whole board
 * over the network to compute five integers, which is fine at nine sessions and
 * indefensible at nine hundred. `MAX_PAGES` is the seatbelt until then: it
 * bounds a mistake at 480 sessions rather than letting a bad `total` spin
 * forever.
 */
const MAX_PAGES = 10;

export const getAllJamSessions = async (
  query: JamSessionQuery = {},
): Promise<JamSession[]> => {
  const first = await getJamSessions(query, { limit: MAX_PAGE_SIZE });
  const sessions = [...first.items];

  const pages = Math.min(Math.ceil(first.total / MAX_PAGE_SIZE), MAX_PAGES);

  for (let page = 2; page <= pages; page += 1) {
    const next = await getJamSessions(query, { page, limit: MAX_PAGE_SIZE });

    sessions.push(...next.items);
  }

  return sessions;
};

/* The cities the city filter can actually find something in, soonest-relevant
   rather than complete: active sessions from today onwards only, so every option
   in the dropdown returns at least one night.

   Its own request rather than being derived from the sessions already on screen,
   which sounds cheaper and is circular — a list built from the current results
   loses every other city the moment one is picked, so choosing Berlin would make
   Leipzig unselectable. The options have to come from outside what they filter.

   The API parses these back out of the free-text address line, so a room whose
   address doesn't carry a postcode simply isn't represented here. One missing
   option, rather than a wrong one. */
export const getJamCities = (): Promise<string[]> =>
  api.get('/jam-sessions/cities', z.array(z.string()));

/* The venue's own board: every session it has posted, cancelled and long past
   ones included, newest first.

   Its own endpoint rather than `GET /jam-sessions?venueId=…`, because the browse
   answers a musician's question and is shaped by it — active only, today
   onwards. Getting a whole board out of it would take an arbitrary `from` far
   enough in the past plus a second request for the cancelled ones, since
   `status` takes one value and not a list. This also can't be pointed at another
   venue: the identity comes from the session cookie, not the query string. */
export const getMyJamSessions = (): Promise<JamSession[]> =>
  api.get('/jam-sessions/mine', z.array(jamSessionSchema));

/* One session, by id.

   Public — no cookie needed, and no status filter either: a cancelled session
   still resolves here. That is deliberate on the API's side (JS12 is a rule
   about the *listing*), and it is what lets a musician holding a booking find
   out the night was called off instead of meeting a 404 for something they know
   exists. The venue's own detail page relies on the same thing.

   404 is the only failure worth branching on; ownership isn't checked here
   because there is nothing to own — this is the same document the browse hands
   to anyone. */
export const getJamSession = (id: string): Promise<JamSession> =>
  api.get(`/jam-sessions/${id}`, jamSessionSchema);

/* DELETE, but the API cancels rather than deletes (JS11) — the row stays so the
   bookings hanging off it still resolve, and every confirmed one of them is
   cancelled with it.

   `api.del` reads no response, which is fine here for a reason worth stating:
   the outcome is not in doubt. A 2xx means the session is now cancelled and its
   date hasn't moved, so the caller already knows the new row without being told.
   Throws `ApiError` on 403 (not yours) and 409 (already gone). */
export const cancelJamSession = (id: string): Promise<void> =>
  api.del(`/jam-sessions/${id}`);
