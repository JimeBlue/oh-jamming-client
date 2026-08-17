'use client';

import { useState } from 'react';
import { FaArrowsRotate, FaMagnifyingGlass, FaSliders } from 'react-icons/fa6';
import { HiOutlineSparkles } from 'react-icons/hi';

import { useTypedPlaceholder } from '@/hooks/useTypedPlaceholder';
import { MAX_SEARCH_CHARS } from '@/services/ai';
import type { JamSessionQuery } from '@/services/jamSessions';
import JamFilters from './JamFilters';

/* The browse's search bar: describe the night you want, in a sentence.

   Two ways of narrowing the same list, so two tabs over one bar rather than two
   bars — the same shape as `AiAssistedField` in the builder, and for the same
   reason. The moment there are two search controls on the page they disagree
   about which one the results came from.

   `POST /ai/search` reads a sentence into the filters `GET /jam-sessions`
   already accepts, which is why the AI half is one text box where the manual tab
   is five controls. */

type Tab = 'ai' | 'manual';

type JamSearchProps = {
  /* The sentence typed on the home page, which has the same box and no list to
     put results in. It is only the field's starting text — `JamBrowse` is what
     actually runs it, so the reading lands next to the board it narrows. */
  initialQuery?: string;
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
  initialQuery,
  onSearch,
  isSearching,
  filters,
  onFiltersChange,
  onReset,
}: JamSearchProps) {
  const [tab, setTab] = useState<Tab>('ai');
  const [query, setQuery] = useState(initialQuery ?? '');

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

  /* Emptying the box gives the whole board back, and it has to: the sentence is
     the only thing on this tab that says why the grid is a subset, so a cleared
     field over a filtered board is a page with no visible reason for what it is
     showing and — since Reset only appears on the Manual tab — no way back.

     The `×` inside a `type="search"` field is the browser's own control and
     fires nothing but an ordinary change, which is why this lives here rather
     than on an event of its own. Backspacing the sentence out by hand therefore
     clears it too, which is the same promise kept: the board matches the box.

     Guarded on there being filters in force, so typing and deleting a character
     on an unfiltered board doesn't fire a pointless request for a list that is
     already on screen. */
  const change = (value: string) => {
    setQuery(value);

    if (value === '' && Object.keys(filters).length > 0) reset();
  };

  const trimmed = query.trim();
  const tooLong = query.length > MAX_SEARCH_CHARS;
  const canSearch = trimmed !== '' && !tooLong && !isSearching;

  const placeholder = useTypedPlaceholder(query === '');

  /* Below the page's heading rather than above it, which is the design and also
     the right order to read: the title says what the board is, and the bar
     narrows it.

     More air underneath than above, and on top of the margin whatever follows
     already carries: the bar is a control and the grid under it is the answer,
     so the gap between them has to be wider than the one holding the bar to its
     own heading. */
  return (
    <section aria-labelledby="jam-search-heading" className="mt-8 mb-12">
      <h2 id="jam-search-heading" className="sr-only">
        Search jam sessions
      </h2>

      {/* Tabs on their own row with the controls under them at every width, which
          is what the design shows and what the bar underneath needs: the AI box
          is one long sentence, and beside a pair of buttons it never had the
          width to show what had been typed into it. */}
      <div className="flex flex-col gap-4">
        {/* Buttons rather than daisyUI's `tab`, which is why the `tabs` class is
            gone with the tray it drew: `.tab` and `.btn` both own the element's
            height, padding and background, so they can't be stacked — the list
            keeps `role="tablist"` and does its own layout.

            The live one is solid royal blue, the other a white tile with a
            hairline — the strongest signal available for the only thing this
            pair has to say, which is which set of controls is on screen. The
            inactive one only takes the blue as ink on hover, never as a fill:
            filling it would make hover announce a selection that hasn't
            happened. */}
        <div role="tablist" className="flex gap-2 self-start">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ai'}
            className={`btn gap-2 whitespace-nowrap border-0 font-bold ${
              tab === 'ai'
                ? 'bg-royal-blue text-white hover:bg-royal-blue/90'
                : 'bg-base-100 text-dark-teal/60 shadow-none ring-1 ring-dark-teal/10 hover:bg-base-100 hover:text-royal-blue hover:ring-royal-blue'
            }`}
            onClick={() => setTab('ai')}
          >
            <HiOutlineSparkles className="size-4" />
            AI search
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'manual'}
            className={`btn gap-2 whitespace-nowrap border-0 font-bold ${
              tab === 'manual'
                ? 'bg-royal-blue text-white hover:bg-royal-blue/90'
                : 'bg-base-100 text-dark-teal/60 shadow-none ring-1 ring-dark-teal/10 hover:bg-base-100 hover:text-royal-blue hover:ring-royal-blue'
            }`}
            onClick={() => setTab('manual')}
          >
            {/* Sliders, not the magnifying glass it used to wear. The bar beside
                it now ends in a magnifier of its own, and two of them on one row
                meaning different things is a glyph that has stopped saying
                anything. */}
            <FaSliders className="size-3.5" />
            Manual
          </button>
        </div>

        {/* The manual panel, in the same place the AI bar occupies — both are the
            row under the tabs, so switching swaps the controls without the page
            below moving. */}
        {tab === 'manual' && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="min-w-0 flex-1">
              <JamFilters key={resetCount} filters={filters} onChange={onFiltersChange} />
            </div>

            {/* The manual tab only, and inside its row rather than beside the
                tabs. Four controls set independently are the case that needs
                one way back — undoing them one at a time is four moves and it
                is easy to lose track of which are still set. A sentence is one
                thing to clear and the field clears itself.

                It still resets everything either tab set, including the
                sentence and the reading above the grid, so the board a musician
                lands back on is the whole board rather than one with an
                invisible filter left on it.

                Absent rather than disabled when there is nothing to undo: a
                disabled control asks the reader to work out why, and the answer
                here — "you haven't filtered anything" — is already obvious from
                the row it would be sitting in. */}
            {canReset && (
              /* A royal-blue wash rather than the pink one the guest list's
                 Reset filters still wears: this row is the page's blue now, and
                 the one control that undoes it shouldn't be the only thing on
                 the tab in a colour of its own.
                 A wash rather than the solid blue the tabs and the Search button
                 use — it undoes work rather than doing any, so it should be
                 findable without competing with them. `border-0` because `.btn`
                 draws one by default and this is meant to read as a tint, not as
                 a fifth outlined box in a row of four. */
              <button
                type="button"
                onClick={reset}
                className="btn h-12 shrink-0 gap-2 self-start border-0 bg-royal-blue/10 font-bold text-royal-blue hover:bg-royal-blue/20 md:self-auto"
              >
                <FaArrowsRotate aria-hidden className="size-4" />
                Reset filters
              </button>
            )}
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
          className="min-w-0"
        >
          <label htmlFor="jam-search-query" className="sr-only">
            Describe the jam session you are looking for
          </label>

          {/* The design's bar is one white card with the button sitting inside
              it, which is why daisyUI's `input` and `join` are both gone: those
              draw an outlined field with a button welded to its edge, and the
              two radii can't be made to nest. This is a plain flex row wearing
              the card's own `rounded-box` and a pad, and the button inside it
              keeps a radius of its own.

              Taller than a default field, because at this width and on its own
              row it is the page's main control rather than one input among
              several. */}
          <div
            className={`flex w-full items-center gap-3 rounded-box bg-base-100 p-2 pl-5 shadow-sm ring-1 transition-shadow focus-within:ring-2 ${
              tooLong ? 'ring-error focus-within:ring-error' : 'ring-dark-teal/10 focus-within:ring-cyan-blue'
            }`}
          >
            {/* The focus ring is on the card rather than on the `<input>`, which
                is what the `focus-within` above is for — a ring drawn around the
                bare field would sit inside the white card and read as a second
                box. `outline-none` on the input itself so the browser's own one
                doesn't draw it twice. */}
            <HiOutlineSparkles
              aria-hidden
              className={`size-5 shrink-0 ${tooLong ? 'text-error' : 'text-cyan-blue'}`}
            />

            <input
              id="jam-search-query"
              type="search"
              value={query}
              onChange={(event) => change(event.target.value)}
              disabled={isSearching}
              /* The animating text is an example, never the field's name —
                 a placeholder that changes under a screen reader is a label
                 that will not hold still. The real name is the sr-only label
                 above, so this stays purely visual. */
              placeholder={placeholder}
              className="min-w-0 grow bg-transparent text-dark-teal outline-none placeholder:text-dark-teal/40"
            />

            {/* Still `disabled` — an empty box is nothing to search and the
                button must not fire — but it keeps the blue instead of taking
                daisyUI's grey. The grey read as a broken control rather than an
                unfinished one: it sits inside the white bar, and a dead grey
                block in the corner of it looked like the bar had failed to load.

                The `!`s are unavoidable: daisyUI's disabled rule nests a
                `:not(.btn-link, .btn-ghost)` inside `.btn:disabled`, which
                out-specifies a plain `disabled:` utility. Full strength rather
                than a tint, because anything faded enough to read as disabled
                takes the white label down with it — the affordance is the
                cursor and the dead click, not the colour. */}
            <button
              type="submit"
              disabled={!canSearch}
              className="btn h-12 shrink-0 gap-2 border-0 bg-royal-blue px-6 font-bold text-white hover:bg-royal-blue/90 disabled:cursor-not-allowed disabled:bg-royal-blue! disabled:text-white!"
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
      </div>
    </section>
  );
}
