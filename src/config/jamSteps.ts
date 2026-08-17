import type { JamFormValues } from '@/schemas/jamSession';

/* The eight screens of the jam builder, in order.

   One list, used three ways: the progress bar reads `shortLabel`, the card
   heading reads `title`, and the wizard's bounds come from `.length` — so
   adding or reordering a step is a change in exactly one place, and the bar
   can't fall out of step with the content it's describing. */

export type JamStep = {
  id: string;
  /* Sits under a circle in the progress bar, so it has roughly 110px on a
     desktop viewport. Anything longer than two short words wraps. */
  shortLabel: string;
  title: string;
  /* Optional, and only the preview step goes without one. Every other step is
     asking for something and the line says what for; the preview asks for
     nothing — the listing under it is the explanation, and a caption over it was
     describing what was already on screen. */
  description?: string;
};

export const JAM_STEPS = [
  {
    id: 'image',
    shortLabel: 'Image',
    title: 'Add an image',
    description: 'A photo of the room gives musicians a feel for the night.',
  },
  {
    id: 'basics',
    shortLabel: 'Basics',
    title: 'Title & description',
    description: 'What the session is called, and the short pitch for it.',
  },
  {
    id: 'when',
    shortLabel: 'When & where',
    title: 'Date, time & location',
    description: 'When the session runs, and the room it runs in.',
  },
  {
    id: 'overview',
    shortLabel: 'Overview',
    title: 'Session overview',
    description: 'The long version — house rules, backline, how the night works.',
  },
  {
    id: 'slots',
    shortLabel: 'Slots',
    title: 'Time slots',
    description: 'How the session is split up for musicians to book.',
  },
  {
    id: 'instruments',
    shortLabel: 'Instruments',
    title: 'Instruments & spots',
    description: 'Which instruments you need, and how many of each.',
  },
  {
    id: 'tags',
    shortLabel: 'Genres & levels',
    title: 'Genres & skill levels',
    description: 'Who this session is for, so the right players find it.',
  },
  {
    id: 'preview',
    shortLabel: 'Preview',
    title: 'Preview & publish',
  },
] as const satisfies readonly JamStep[];

/* `as const satisfies` rather than a plain annotation: the array keeps its
   literal types (so JamStepId below is the eight actual ids, not `string`)
   while still being checked against the shape. */
export type JamStepId = (typeof JAM_STEPS)[number]['id'];

export const JAM_STEP_COUNT = JAM_STEPS.length;

/* Which of the form's fields each step is responsible for.

   There is one form behind all eight screens, so "is this step finished?" has to
   be asked as "are *these* fields valid?" — validating the whole thing on every
   Next would stop someone on step 2 because they haven't chosen a genre yet.
   `trigger(JAM_STEP_FIELDS[id])` is that question.

   Top-level names only, and typed as `keyof` to keep it that way: the wizard
   also uses this map in reverse, to find which step an error belongs to when a
   submit fails, and that lookup reads the error object one key deep.

   Cross-field errors land on whichever field the rule names — "doesn't divide
   evenly" is reported on `slotDurationMinutes`, so it surfaces on the slots step
   even though the times it depends on were entered two steps earlier. That's the
   right place: the slot length is what the venue can change from there. */
export const JAM_STEP_FIELDS: Record<JamStepId, readonly (keyof JamFormValues)[]> = {
  /* Nothing to validate: the photo is optional, and the only value `image` can
     hold is a URL the API produced. Listing it here would run a rule that has
     already been enforced by the one thing that can write to the field. */
  image: [],
  basics: ['title', 'summary'],
  when: ['date', 'startTime', 'endTime', 'venueName', 'address'],
  overview: ['overview'],
  slots: ['slotDurationMinutes'],
  instruments: ['instrumentTemplate'],
  tags: ['genres', 'skillLevel'],
  /* The last step introduces no fields of its own; publishing validates the
     whole form in one go. */
  preview: [],
};
