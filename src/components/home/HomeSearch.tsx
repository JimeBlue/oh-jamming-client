'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaMagnifyingGlass } from 'react-icons/fa6';
import { HiOutlineSparkles } from 'react-icons/hi';

import { useTypedPlaceholder } from '@/hooks/useTypedPlaceholder';
import { MAX_SEARCH_CHARS } from '@/services/ai';

/* The first thing under the hero: describe the night you want, in a sentence.

   It does not search. It hands the sentence to `/jams`, which reads it with
   `POST /ai/search` and draws the board — and that is the whole point of the
   split. The reading the API sends back is a small state machine (what it
   understood, the parts it could express no filter for, a 429 from the shared
   daily quota), and every one of those is something to say *next to the
   results*. Searching here would mean either explaining the reading on a page
   with no list under it, or spending the call twice.

   So there is no AI/Manual pair either, and not only because the home page has
   room for one control: the manual tab is five inputs that narrow a list you can
   see. On a page with no list they would be five questions asked in the dark.
   Musicians who want them are one click away, with the board already on screen. */
export default function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const trimmed = query.trim();
  const tooLong = query.length > MAX_SEARCH_CHARS;
  const canSearch = trimmed !== '' && !tooLong;

  const placeholder = useTypedPlaceholder(query === '');

  return (
    <section
      aria-labelledby="home-search-heading"
      className="bg-pale-blue px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mx-auto max-w-4xl">
          {/* Space Grotesk in caps rather than Changa One: at this size the
              display face is all stroke and no counter, and the line is a label
              for the heading under it rather than a second heading. */}
          {/* Centred from `sm` up, left-aligned below it. Two lines of centred
              text on a 375px phone is a ragged block with no edge to read down —
              the width is the reason, so the breakpoint is where the width
              arrives rather than a taste applied everywhere. */}
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-cyan-blue sm:text-center">
            Find a spot
          </p>

          <h2
            id="home-search-heading"
            className="mt-3 font-display text-3xl font-bold tracking-tight text-dark-teal sm:text-center sm:text-5xl"
          >
            Where do you want to play?
          </h2>

          {/* A form rather than a div, so the phone keyboard offers "search" and
              Enter submits — both come from the element, not from a handler. */}
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSearch) {
                router.push(`/jams?q=${encodeURIComponent(trimmed)}`);
              }
            }}
            className="mt-8 rounded-[1.25rem] bg-base-100 p-4 shadow-lg sm:p-5"
          >
            <label htmlFor="home-search-query" className="sr-only">
              Describe the jam session you are looking for
            </label>

            {/* Field and button, stacked on a phone and one bar from `sm` up.
                The pale ground is on both, so above `sm` they read as a single
                inset bar with the button sitting in it — below that the button
                leaves the bar and goes full width, because a search control
                small enough to sit beside a typeable field on 375px is too small
                to be the thing the section is for. */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2 sm:rounded-box sm:bg-pale-blue sm:p-2">
              <label className="flex items-center gap-3 rounded-box bg-pale-blue px-4 py-4 focus-within:outline-1 focus-within:outline-cyan-blue sm:min-w-0 sm:flex-1 sm:py-2">
                <HiOutlineSparkles
                  aria-hidden
                  className={`size-5 shrink-0 ${tooLong ? 'text-error' : 'text-cyan-blue'}`}
                />

                <input
                  id="home-search-query"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  /* The animating text is an example, never the field's name — a
                     placeholder that changes under a screen reader is a label
                     that will not hold still. The real name is the sr-only label
                     above, so this stays purely visual. */
                  placeholder={placeholder}
                  /* The placeholder is a colour away from the value on purpose:
                     it writes itself out a character at a time, and text that
                     moves in the same colour as what you typed reads as the
                     field editing itself. The section's own cyan — the same one
                     the eyebrow and the sparkle beside this field wear — so the
                     moving text belongs to the section rather than introducing
                     a hue that appears nowhere else. */
                  className="min-w-0 grow bg-transparent text-dark-teal placeholder:text-cyan-blue focus:outline-none"
                />
              </label>

              {/* Cyan rather than the royal blue the page's other buttons wear:
                  this one starts the app's one flow, and it is the only control
                  in the section. Not `disabled` on an empty box — the check is
                  in the submit handler instead, because a dead grey block is the
                  first thing you see in a section whose field is empty by
                  definition, and it reads as a search that is broken rather than
                  as one waiting for a sentence. */}
              {/* Inverting on hover, the same move the header's CTA makes — and
                  written out for the same reason: `btn-outline` sets the
                  *resting* state, and the fill has to stay and only drop on
                  hover. The border is there at rest too, in the fill's own
                  colour, so gaining a visible edge doesn't also change the
                  button's size. */}
              <button
                type="submit"
                className="btn h-12 shrink-0 gap-2 border-cyan-blue bg-cyan-blue font-display text-base font-bold text-white shadow-none transition-colors hover:border-cyan-blue hover:bg-transparent hover:text-cyan-blue"
              >
                <FaMagnifyingGlass aria-hidden className="size-4" />
                AI search
              </button>
            </div>

            {/* Only ever shown once the cap is passed, so the field carries no
                counter at rest — this is a search box, not a form field, and a
                running count under it would suggest a length worth aiming for. */}
            {tooLong && (
              <p role="alert" className="mt-3 text-sm text-error">
                That&apos;s longer than {MAX_SEARCH_CHARS} characters. Try a shorter
                sentence — genre, city and when is plenty.
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
