import { z } from 'zod';

import { api } from '@/services/api';

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
