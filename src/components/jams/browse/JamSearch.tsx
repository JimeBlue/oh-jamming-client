'use client';

import { useEffect, useState } from 'react';
import { FaMagnifyingGlass } from 'react-icons/fa6';
import { HiOutlineSparkles } from 'react-icons/hi';

import { MAX_SEARCH_CHARS } from '@/services/ai';

/* The browse's search bar: describe the night you want, in a sentence.

   Two ways of narrowing the same list, so two tabs over one bar rather than two
   bars — the same shape as `AiAssistedField` in the builder, and for the same
   reason. The moment there are two search controls on the page they disagree
   about which one the results came from.

   Only the AI half is built. `POST /ai/search` reads a sentence into the filters
   `GET /jam-sessions` already accepts, which is why this can be one text box
   where the manual tab will be five controls. */

/* Typed out one character at a time under the cursor, like the search box this
   is modelled on. The examples are doing real work: nothing on the page says
   what a sentence here may contain, and "jazz jam this weekend" answers that in
   a way no hint text does — every one of these is a query the API actually
   resolves, so they are a promise rather than a suggestion. */
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

type Tab = 'ai' | 'manual';

type JamSearchProps = {
  /* Given the raw sentence, not filters. Reading it is the API's job and the
     result is a whole state machine — a reading, the parts it couldn't honour,
     a 429 — which belongs beside the list it changes rather than in here. */
  onSearch: (query: string) => void;
  /* Owned above for the same reason: the spinner and the grid underneath are the
     same request, and two components deciding separately whether it is in flight
     is how a button stops spinning while the list is still loading. */
  isSearching: boolean;
};

export default function JamSearch({ onSearch, isSearching }: JamSearchProps) {
  const [tab, setTab] = useState<Tab>('ai');
  const [query, setQuery] = useState('');

  const trimmed = query.trim();
  const tooLong = query.length > MAX_SEARCH_CHARS;
  const canSearch = trimmed !== '' && !tooLong && !isSearching;

  const placeholder = useTypedPlaceholder(query === '');

  return (
    <section aria-labelledby="jam-search-heading" className="mb-10">
      <h2 id="jam-search-heading" className="sr-only">
        Search jam sessions
      </h2>

      {/* Stacked below md, side by side above it. The tabs go on top rather than
          beside on a phone because the bar underneath needs the full width to be
          typeable at all — two tabs and an input sharing 375px leaves a box too
          narrow to see what you have written. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        {/* `tabs-box` rather than the builder's `tabs-lift`: nothing is attached
            underneath here, so this is a segmented control choosing what the bar
            beside it does. It takes `--radius-field` from the theme, which is
            what keeps it square-ish next to the fully rounded pill in the design
            — same radius as every input and button in the wizard. */}
        <div role="tablist" className="tabs tabs-box shrink-0 self-start p-1 md:self-auto">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ai'}
            className={`tab gap-2 whitespace-nowrap font-bold ${
              tab === 'ai' ? 'tab-active text-primary' : 'hover:text-primary'
            }`}
            onClick={() => setTab('ai')}
          >
            <HiOutlineSparkles className="size-4" />
            AI-search
          </button>

          {/* Disabled rather than absent, and rather than a tab that switches to
              nothing. The manual filters are the next piece of work; a tab that
              looks live and answers a click with an unchanged page is the one
              version of this that reads as broken. */}
          <button
            type="button"
            role="tab"
            disabled
            aria-selected={tab === 'manual'}
            className="tab gap-2 whitespace-nowrap font-bold"
          >
            <FaMagnifyingGlass className="size-3.5" />
            Manual
          </button>
        </div>

        {/* A form rather than a div so the phone keyboard offers "search" and
            Enter submits — both come from the element, not from a handler. */}
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSearch) onSearch(trimmed);
          }}
          className="min-w-0 flex-1"
        >
          <label htmlFor="jam-search-query" className="sr-only">
            Describe the jam session you are looking for
          </label>

          {/* `join` for the attached bar: it rounds only the outer corners, and
              with `--radius-field` at 0.5rem that is the wizard's radius rather
              than the design's pill. */}
          <div className="join w-full">
            {/* daisyUI 5 puts the icon inside by making the wrapper the `input`
                — the control itself carries no `input` class. Indigo border and
                indigo glyph; `input-primary` alone leaves the icon at body
                colour, which reads as a disabled field next to a primary button. */}
            <label
              className={`input join-item flex w-full items-center gap-3 md:input-lg ${
                tooLong ? 'input-error' : 'input-primary'
              }`}
            >
              <HiOutlineSparkles
                aria-hidden
                className={`size-5 shrink-0 ${tooLong ? 'text-error' : 'text-primary'}`}
              />

              <input
                id="jam-search-query"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                disabled={isSearching}
                /* The animating text is an example, never the field's name —
                   a placeholder that changes under a screen reader is a label
                   that will not hold still. The real name is the sr-only label
                   above, so this stays purely visual. */
                placeholder={placeholder}
                className="grow"
              />
            </label>

            <button
              type="submit"
              disabled={!canSearch}
              className="btn btn-primary join-item gap-2 font-bold md:btn-lg"
            >
              {isSearching ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <FaMagnifyingGlass className="size-4" />
              )}
              {/* The word is hidden on a phone, where the bar has to leave room
                  for the text being typed into it. The button keeps its
                  accessible name from the label below. */}
              <span className="max-sm:sr-only">{isSearching ? 'Reading…' : 'Search'}</span>
            </button>
          </div>

          {/* Only ever shown once the cap is passed, so the field carries no
              counter at rest — this is a search box, not a form field, and a
              running count under it would suggest a length worth aiming for. */}
          {tooLong && (
            <p role="alert" className="mt-2 text-sm text-error">
              That&apos;s longer than {MAX_SEARCH_CHARS} characters. Try a shorter
              sentence — genre, city and when is plenty.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

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

/* The running example under the cursor.

   Chained timeouts rather than one interval, because the three phases run at
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
const useTypedPlaceholder = (enabled: boolean): string => {
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
