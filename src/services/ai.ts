import { z } from 'zod';

import { genres, skillLevels } from '@/schemas/jamSession';
import { api } from '@/services/api';
import type { JamSessionQuery } from '@/services/jamSessions';

/* Notes in, markdown out. Nothing is created and nothing is stored — the venue
   gets a string they can edit, keep or throw away, and the session is still made
   by the single POST at the end of the wizard.

   Through the API rather than from the browser, for the same reason as the image
   upload: the key has to stay server-side, and going through the API makes the
   call venue-only and rate-limited like every other write. The quota it protects
   is not per-user — the Gemini free tier gives the whole deployed app 500
   generations a day, shared. */

/* Mirrors `MAX_NOTES_CHARS` in the API's `aiSchema`, and is enforced there too.
   This copy exists so a paste that's too long disables the button instead of
   spending a request to be told 400. */
export const MAX_NOTES_CHARS = 1000;

const generatedOverviewSchema = z.object({ overview: z.string() });
const generatedSummarySchema = z.object({ summary: z.string() });

/* Two calls rather than one with a flag, mirroring the two routes. They write
   different things — the long description, and the line that decides whether a
   musician opens the session at all — and a caller always knows which it wants.

   Both spend the same daily quota, so ten summaries are ten fewer overviews. */

export const generateJamOverview = async (notes: string): Promise<string> => {
  const { overview } = await api.post('/ai/overview', { notes }, generatedOverviewSchema);

  return overview;
};

export const generateJamSummary = async (notes: string): Promise<string> => {
  const { summary } = await api.post('/ai/summary', { notes }, generatedSummarySchema);

  return summary;
};

/* ---------------------------------------------------------------------------
   AI search
   --------------------------------------------------------------------------- */

/* Mirrors `MAX_SEARCH_CHARS` in the API's `aiSchema`, same bargain as the notes
   cap above: a paste that's too long is stopped here rather than spending a
   request to be told 400. */
export const MAX_SEARCH_CHARS = 200;

/* What the API hands back is a *reading*, not results: the filters it understood
   the sentence to mean, which the caller then passes to `getJamSessions`. The
   search never queries anything itself, so there is one place that knows how the
   browse is filtered and sorted, and the AI and manual tabs end up making
   literally the same request.

   `z.object`, permissive like every other response schema here. The filters
   inside are the strict part — they are about to be put in a query string the
   API validates with a strictObject, so a genre it wouldn't accept is worth
   catching here rather than turning into a 400 on the next request. */
const aiSearchSchema = z.object({
  /* False when the sentence wasn't a search for a jam night at all. The filters
     come back empty in that case, which on its own is indistinguishable from
     "everything" — this is the flag that lets the UI say so instead of quietly
     showing the unfiltered board. */
  understood: z.boolean(),
  explanation: z.string(),
  /* Parts of the sentence no filter can express — an instrument, "with spots
     left", a price. Without showing these the search answers a narrower question
     than the one asked and looks broken in the way that can't be debugged. */
  ignored: z.array(z.string()),
  filters: z.object({
    genre: z.enum(genres).optional(),
    skillLevel: z.enum(skillLevels).optional(),
    city: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

export type AiSearchResult = {
  understood: boolean;
  explanation: string;
  ignored: string[];
  filters: JamSessionQuery;
};

/* Public, unlike the two writers above — no cookie, no role. A musician has to
   be able to search before deciding whether to sign up, which is also why this
   spends from a quota anyone can reach and has a tighter rate limit than the
   venue-only routes. */
export const searchJams = (query: string): Promise<AiSearchResult> =>
  api.post('/ai/search', { query }, aiSearchSchema);
