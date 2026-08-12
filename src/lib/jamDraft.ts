import { z } from 'zod';

import { JAM_STEP_COUNT } from '@/config/jamSteps';
import { genres, skillLevels, type JamFormValues } from '@/schemas/jamSession';

/* The wizard is eight steps of typing that exist only in React state, and a
   reload — an accidental ⌘R, a phone rotating into a tab reap, a dev-server HMR
   hiccup — would otherwise throw all of it away. Nothing is stored server-side
   until the final POST, so if this side doesn't remember, nobody does.

   sessionStorage rather than localStorage, deliberately: a draft belongs to the
   tab it was typed in. localStorage would resurrect a half-filled session in a
   window opened three weeks later, and two tabs building two different sessions
   would silently overwrite each other. */

const STORAGE_KEY = 'oh-jamming:jam-draft';

export type JamDraft = {
  stepIndex: number;
  values: JamFormValues;
};

/* Shape only — no minimum lengths, no cross-field rules. A draft is *supposed*
   to be half-finished; the point of this schema isn't to judge the content, it's
   to make sure what comes back out of storage has the types the form and the
   inputs expect. A `genres` that arrived as a string instead of an array would
   crash the chip list on render, long after the bad value was written.

   The `z.ZodType<JamDraft>` annotation is the load-bearing part: add a field to
   the form and forget it here, and this line stops compiling. Without it the two
   would drift and the new field simply wouldn't survive a reload — a bug with no
   symptom until someone notices their work is half gone. */
const jamDraftSchema: z.ZodType<JamDraft> = z.object({
  stepIndex: z.int().min(0).max(JAM_STEP_COUNT - 1),
  values: z.object({
    title: z.string(),
    summary: z.string(),
    /* No `image`: the photo is a File held in JamImageContext until publish, and
       a File cannot be written here as JSON. It is the one thing a reload loses.
       See the note at the top of that file. */
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    venueName: z.string(),
    address: z.object({
      formatted: z.string(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    }),
    overview: z.string(),
    slotDurationMinutes: z.number(),
    instrumentTemplate: z.array(
      z.object({ instrument: z.string(), spotsTotal: z.number() }),
    ),
    genres: z.array(z.enum(genres)),
    skillLevel: z.array(z.enum(skillLevels)),
  }),
});

/* Returns null rather than throwing, for every way this can go wrong: no draft,
   unreadable storage, malformed JSON, or a draft written by an older build whose
   shape has since changed. The last one is the interesting case — discarding it
   is the right answer, because a partially-restored form is harder to notice and
   harder to fix than an empty one. */
export const readJamDraft = (): JamDraft | null => {
  /* JamWizard only ever mounts on the client — the role guard above it renders a
     spinner until /auth/me answers, so this never runs during SSR. The guard is
     here anyway: relying on that is a coupling nobody would think to check
     before moving a component. */
  if (typeof window === 'undefined') return null;

  let stored: string | null = null;

  try {
    stored = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    /* Safari in private mode, or storage disabled entirely. */
    return null;
  }

  if (!stored) return null;

  try {
    const draft = jamDraftSchema.safeParse(JSON.parse(stored));

    if (draft.success) return draft.data;
  } catch {
    /* not JSON at all */
  }

  clearJamDraft();

  return null;
};

export const writeJamDraft = (draft: JamDraft): void => {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* Out of quota, or storage disabled. Losing the safety net is not worth
       interrupting someone mid-sentence over — the form itself still works. */
  }
};

export const clearJamDraft = (): void => {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* see above */
  }
};
