import type { Genre, SkillLevel } from '@/schemas/jamSession';

/* Display copy for the values the API stores, and the slot lengths the form
   offers. Kept out of schemas/jamSession because that file is the data contract
   — what the API will and won't accept — and this is what a person reads.

   Typed as Record<Genre, string> rather than a loose map on purpose: extend the
   API's list, mirror it in the schema, and forget this file, and the build stops
   here rather than rendering a raw "hip-hop" in the middle of a chip row. */

export const GENRE_LABELS: Record<Genre, string> = {
  'all-genres': 'All genres',
  blues: 'Blues',
  electronic: 'Electronic',
  experimental: 'Experimental',
  folk: 'Folk',
  funk: 'Funk',
  'hip-hop': 'Hip hop',
  jazz: 'Jazz',
  latin: 'Latin',
  metal: 'Metal',
  pop: 'Pop',
  reggae: 'Reggae',
  rock: 'Rock',
  soul: 'Soul',
};

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  'all-levels': 'All levels',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/* The lengths on offer, all inside the API's 15–240 window. A fixed list rather
   than a free number field because the real constraint isn't the length itself —
   it's whether the length divides the session evenly — and a list is something
   the step can grey out one option at a time. Typing "37" into a number field
   and being told no afterwards is a worse version of the same conversation. */
export const SLOT_DURATION_OPTIONS = [15, 20, 30, 45, 60, 90, 120] as const;
