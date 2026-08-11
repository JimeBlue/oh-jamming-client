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
  description: string;
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
    description: 'How your session will look to musicians.',
  },
] as const satisfies readonly JamStep[];

/* `as const satisfies` rather than a plain annotation: the array keeps its
   literal types (so JamStepId below is the eight actual ids, not `string`)
   while still being checked against the shape. */
export type JamStepId = (typeof JAM_STEPS)[number]['id'];

export const JAM_STEP_COUNT = JAM_STEPS.length;
