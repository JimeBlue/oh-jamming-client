import { z } from 'zod';

import {
  jamSessionSchema,
  type JamSession,
  type JamSessionPayload,
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
