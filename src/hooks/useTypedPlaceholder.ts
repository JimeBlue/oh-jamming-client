import { useEffect, useState } from 'react';

/* The running example under the cursor of an AI search box.

   Lifted out of `JamSearch` when the home page grew a second one. The examples
   are the reason it is shared rather than copied: nothing on either page says
   what a sentence may contain, and these answer it — every one is a query the
   API actually resolves, so they are a promise rather than a suggestion. Two
   lists would be two promises, and the second one to drift would be making a
   claim the search can't keep. */
const EXAMPLES = [
  'jazz jam this weekend',
  'blues jam in Nürnberg',
  'somewhere to play tonight',
  'rock night in Berlin next week',
  'beginner friendly jam in September',
];

const TYPE_MS = 55;
const DELETE_MS = 30;
/* Long enough to read the whole line after it lands, which is the only moment
   the example is actually doing its job. */
const HOLD_MS = 2200;

type TypingState = { index: number; typed: string; deleting: boolean };

/* One state, advanced one step at a time, and both of those are load-bearing.
   Three separate pieces of state would mean the "finished deleting, move to the
   next example" transition happens in the effect body rather than in a timeout —
   a synchronous setState during an effect, which React lints against because it
   renders twice for one visible change. Here every transition is the timeout's
   job, so the effect only ever schedules. */
const nextStep = ({ index, typed, deleting }: TypingState): TypingState => {
  const full = EXAMPLES[index] ?? '';

  if (deleting) {
    /* Emptied — take the next example rather than pausing on a blank field, so
       the line is never gone for longer than one frame. */
    return typed === ''
      ? { index: (index + 1) % EXAMPLES.length, typed: '', deleting: false }
      : { index, typed: full.slice(0, typed.length - 1), deleting: true };
  }

  return typed === full
    ? { index, typed, deleting: true }
    : { index, typed: full.slice(0, typed.length + 1), deleting: false };
};

/* Chained timeouts rather than one interval, because the three phases run at
   three speeds — typing is slower than deleting, and the pause at the end of a
   line is longer than both. One interval would mean ticking at the fastest of
   them and counting, which is the same thing written less clearly.

   It starts on the first example complete rather than on an empty field. That is
   what the server renders, so it is what the client hydrates to — and it doubles
   as the reduced-motion answer below, where the loop never starts and this is
   simply what the field says.

   `enabled` goes false the moment the musician types anything: the placeholder
   is invisible behind their text, and a timer re-rendering the field underneath
   what they are writing is work nobody can see. */
export const useTypedPlaceholder = (enabled: boolean): string => {
  const [state, setState] = useState<TypingState>({
    index: 0,
    typed: EXAMPLES[0] ?? '',
    deleting: false,
  });

  useEffect(() => {
    /* Read here rather than held in state, which would need its own mount effect
       to set it — the second thing React lints against. Someone who asks for
       less motion gets the first example standing still: the examples are the
       point and the typing is decoration, so dropping the decoration keeps it. */
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const full = EXAMPLES[state.index] ?? '';
    const finished = !state.deleting && state.typed === full;

    const timer = setTimeout(
      () => setState(nextStep),
      finished ? HOLD_MS : state.deleting ? DELETE_MS : TYPE_MS,
    );

    return () => clearTimeout(timer);
  }, [state, enabled]);

  return state.typed;
};
