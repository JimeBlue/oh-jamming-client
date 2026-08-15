'use client';

import { useEffect, useState } from 'react';
import { FaArrowsRotate, FaMagnifyingGlass } from 'react-icons/fa6';
import { HiOutlineSparkles } from 'react-icons/hi';

import { MAX_SEARCH_CHARS } from '@/services/ai';
import type { JamSessionQuery } from '@/services/jamSessions';
import JamFilters from './JamFilters';

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
  /* The same filters both tabs write. That is the point of the pair rather than
     an implementation detail: an AI search sets these, so switching to Manual
     afterwards shows what the sentence was understood to mean, in controls that
     can be corrected one at a time. */
  filters: JamSessionQuery;
  onFiltersChange: (filters: JamSessionQuery) => void;
  onReset: () => void;
};

export default function JamSearch({
  onSearch,
  isSearching,
  filters,
  onFiltersChange,
  onReset,
}: JamSearchProps) {
  const [tab, setTab] = useState<Tab>('ai');
  const [query, setQuery] = useState('');

  /* One Reset for both tabs, shown only when there is something to undo. The
     query counts alongside the filters: a sentence the AI could extract no
     filter from still leaves text in the box, and a control that clears the
     board without clearing what is written in it looks like it failed. */
  const canReset = Object.keys(filters).length > 0 || query !== '';

  /* Bumped on reset and used as `JamFilters`' key, which remounts it.

     Its date control keeps one piece of state the filters can't express —
     whether the custom range inputs are open — because "custom" isn't a range,
     it's the absence of a preset that matches. Clearing the filters therefore
     leaves that select reading "Custom range…" over two empty date fields, which
     is a reset that visibly didn't reset. Remounting is the honest way to say
     "start this control over" to a component holding state of its own; reaching
     in to clear that one flag would mean lifting it here, where nothing else
     needs it. */
  const [resetCount, setResetCount] = useState(0);

  const reset = () => {
    setQuery('');
    setResetCount((count) => count + 1);
    onReset();
  };

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
        {/* Outlined buttons rather than daisyUI's `tab`, which is why the `tabs`
            class is gone with the tray it drew: `.tab` and `.btn` both own the
            element's height, padding and background, so they can't be stacked —
            the list keeps `role="tablist"` and does its own layout.

            The live one is solid, the other an outline — the strongest signal
            available for the only thing this pair has to say, which is which set
            of controls is on screen.

            Both invert on hover, which is the opposite of daisyUI's own outline
            behaviour and deliberate. Its `btn-outline` fills on hover, so left
            alone the inactive tab would go solid indigo under the pointer and
            look exactly like the active one — hover would be announcing a state
            change that hasn't happened. Swapping the fill instead keeps the two
            distinguishable in every combination of hover and selection. */}
        <div role="tablist" className="flex shrink-0 gap-2 self-start md:self-auto">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ai'}
            className={`btn gap-2 whitespace-nowrap font-bold ${
              tab === 'ai'                ? 'btn-primary hover:border-primary hover:bg-transparent hover:text-primary'
                : 'btn-outline border-base-300 text-base-content/60 hover:border-primary hover:bg-transparent hover:text-primary'
            }`}
            onClick={() => setTab('ai')}
          >
            <HiOutlineSparkles className="size-4" />
            AI-search
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'manual'}
            className={`btn gap-2 whitespace-nowrap font-bold ${
              tab === 'manual'                ? 'btn-primary hover:border-primary hover:bg-transparent hover:text-primary'
                : 'btn-outline border-base-300 text-base-content/60 hover:border-primary hover:bg-transparent hover:text-primary'
            }`}
            onClick={() => setTab('manual')}
          >
            <FaMagnifyingGlass className="size-3.5" />
            Manual
          </button>
        </div>

        {/* The manual panel, in the same place the AI bar occupies — both are the
            one row beside the tabs, so switching swaps the controls without the
            page below moving. */}
        {tab === 'manual' && (
          <div className="min-w-0 flex-1">
            <JamFilters key={resetCount} filters={filters} onChange={onFiltersChange} />
          </div>
        )}

        {/* A form rather than a div so the phone keyboard offers "search" and
            Enter submits — both come from the element, not from a handler.

            Unmounted rather than hidden when the other tab is showing, unlike
            the builder's `AiAssistedField`, which keeps both panels alive to
            protect a half-typed draft and a caret position. Nothing here is
            worth protecting: the query survives in state either way, and a
            second `role="search"` form in the page is a second landmark
            announcing itself to anyone navigating by them. */}
        {tab === 'ai' && (
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
              than the design's pill.

              Default size, not `lg`. From `md` up the tabs sit on the same line
              as this, and they are buttons at daisyUI's default height — an `lg`
              bar beside them made the pair look like a control and its caption
              rather than one row. */}
          <div className="join w-full">
            {/* daisyUI 5 puts the icon inside by making the wrapper the `input`
                — the control itself carries no `input` class. Indigo border and
                indigo glyph; `input-primary` alone leaves the icon at body
                colour, which reads as a disabled field next to a primary button. */}
            {/* Focus leaves the edge exactly as it is at rest. daisyUI draws a
                2px ring at `outline-offset: 2px`, which sits in the gap outside
                the border and makes the focused field read as taller than the
                button joined to it — an outline takes no layout space, so the
                two are the same 48px either way and it is purely the second
                line doing it.

                1px wide at -1px offset lands the ring exactly on the border it
                already has, covering it rather than adding to it. Kept rather
                than removed with `outline-none`: the caret is the only other
                thing saying where focus is, and it disappears every time the
                animated placeholder repaints. */}
            <label
              className={`input join-item flex w-full items-center gap-3 focus-within:outline-1 focus-within:outline-offset-[-1px] ${
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

            {/* Still `disabled` — an empty box is nothing to search and the
                button must not fire — but it keeps the indigo instead of taking
                daisyUI's grey. The grey read as a broken control rather than an
                unfinished one: the field beside it is empty and outlined in
                indigo, and a dead grey block on the end of it looked like the
                bar had failed to load.

                The `!`s are unavoidable: daisyUI's disabled rule nests a
                `:not(.btn-link, .btn-ghost)` inside `.btn:disabled`, which
                out-specifies a plain `disabled:` utility. Full strength rather
                than a tint, because anything faded enough to read as disabled
                takes the white label down with it — the affordance is the
                cursor and the dead click, not the colour. */}
            <button
              type="submit"
              disabled={!canSearch}
              className="btn btn-primary join-item gap-2 font-bold disabled:cursor-not-allowed disabled:border-primary! disabled:bg-primary! disabled:text-primary-content!"
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
        )}

        {/* The manual tab only. Four controls set independently are the case that
            needs one way back — undoing them one at a time is four moves and it
            is easy to lose track of which are still set. A sentence is one thing
            to clear and the field clears itself.

            It still resets everything either tab set, including the sentence and
            the reading above the grid, so the board a musician lands back on is
            the whole board rather than one with an invisible filter left on it.

            Absent rather than disabled when there is nothing to undo: a disabled
            control asks the reader to work out why, and the answer here — "you
            haven't filtered anything" — is already obvious from the row it would
            be sitting in. */}
        {tab === 'manual' && canReset && (
          /* The soft pink wash the guest list's Reset filters wears, so the one
             control that undoes a filter strip looks the same on both sides of
             the app. `border-0` because `.btn` draws one by default and the wash
             is meant to read as a tint rather than as a fourth outlined box in a
             row of three. */
          <button
            type="button"
            onClick={reset}
            className="btn shrink-0 gap-2 self-start border-0 bg-status-taken/10 font-bold text-status-taken hover:bg-status-taken/20 md:self-auto"
          >
            <FaArrowsRotate aria-hidden className="size-4" />
            Reset filters
          </button>
        )}
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
