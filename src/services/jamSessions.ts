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
