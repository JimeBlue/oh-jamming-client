'use client';

import dynamic from 'next/dynamic';
import { useEffect, useId, useRef, useState } from 'react';
import { useController } from 'react-hook-form';
import { FaLocationDot, FaMagnifyingGlass } from 'react-icons/fa6';
import { IoLocationOutline } from 'react-icons/io5';

import { useAddressSearch } from '@/hooks/useAddressSearch';
import { useJamForm } from '@/hooks/useJamForm';
import type { AddressSuggestion } from '@/services/geocoding';
import JamField from './JamField';

/* Type the address, pick it off the list, see the pin.

   The whole `address` object is controlled here rather than registering
   `address.formatted` on its own, because the three values are one fact: the
   text and the coordinates have to be written together, or the map ends up
   pointing somewhere the address no longer names. Typing after a pick therefore
   *drops* the coordinates — the venue is describing a different place, and a
   stale pin is worse than no pin.

   Free text always stays submittable. The API asks only for `formatted`, and
   plenty of real rooms — a workshop behind a courtyard, a bar that changed its
   name last month — simply aren't in OpenStreetMap. */

const VenueMap = dynamic(() => import('../VenueMap'), {
  /* Leaflet touches `window` at import time; see the note in VenueMap. */
  ssr: false,
  loading: () => (
    <div className="h-64 w-full animate-pulse rounded-box bg-base-200" />
  ),
});

export default function AddressField() {
  const {
    control,
    trigger,
    formState: { errors },
  } = useJamForm();

  const { field } = useController({ control, name: 'address' });
  const { formatted, lat, lng } = field.value;

  /* Separate from the field's own value on purpose: a restored draft already
     has an address in it, and deriving the query from the form value would fire
     a lookup and drop a list over the page before the venue has touched
     anything. This only ever fills in from a keystroke. */
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const { suggestions, status } = useAddressSearch(query);

  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  /* Arrowing past the bottom of a scrollable list otherwise moves a highlight
     nobody can see. */
  useEffect(() => {
    if (activeIndex < 0) return;

    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const select = (suggestion: AddressSuggestion) => {
    field.onChange({
      formatted: suggestion.formatted,
      lat: suggestion.lat,
      lng: suggestion.lng,
    });

    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);

    /* Picked with a click or Enter, so no blur follows and the form's onTouched
       re-validation never runs — without this, "please enter the full address"
       stays on screen under a perfectly good address. */
    void trigger('address');
  };

  const change = (value: string) => {
    /* Coordinates deliberately absent: whatever was pinned is no longer what
       this text says. */
    field.onChange({ formatted: value });
    setQuery(value);
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === 'Enter') {
      /* The wizard turns Enter into "next step". While the list is open that
         would skip past a half-finished address behind a panel the venue was
         still reading, so Enter belongs to the list until the list is gone. */
      if (!isOpen || suggestions.length === 0) return;

      event.preventDefault();

      const suggestion = suggestions[activeIndex];

      if (suggestion) {
        select(suggestion);
        return;
      }

      setIsOpen(false);
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    if (suggestions.length === 0) return;

    /* Otherwise the caret jumps to the start or end of the text under the
       highlight moving. */
    event.preventDefault();
    setIsOpen(true);

    const step = event.key === 'ArrowDown' ? 1 : -1;

    /* Wraps at both ends, and ArrowUp from nothing-selected lands on the last
       row — which is what someone reaching for the bottom of the list means. */
    setActiveIndex((current) => {
      const next = current + step;

      if (next < 0) return suggestions.length - 1;
      if (next >= suggestions.length) return 0;

      return next;
    });
  };

  const hasPin = lat !== undefined && lng !== undefined;
  const showList = isOpen && query.trim().length > 0;

  return (
    <div className="space-y-3">
      {/* onBlur on the wrapper rather than the input: moving focus from the
          input to an option is still "inside the combobox", and closing on the
          input's own blur would tear the list away mid-click. */}
      <div
        className="relative"
        onBlur={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;

          setIsOpen(false);
          setActiveIndex(-1);
        }}
      >
        <JamField
          label="Address*"
          /* The pairing rule reports on `address.lat`, and a draft written by an
             older build could still carry a half-filled pair — an error with
             nowhere to appear is an error nobody can fix. */
          error={errors.address?.formatted?.message ?? errors.address?.lat?.message}
          hint="Start typing and pick the match — or just type it out if the room isn't listed."
        >
          <div className="relative">
            {/* z-10 because daisyUI's `.input` is itself `position: relative`
                with an opaque background, so being later in the DOM it paints
                straight over an absolutely-positioned sibling. Without this the
                icon is there, correctly placed, and completely invisible. */}
            <FaMagnifyingGlass className="pointer-events-none absolute top-1/2 left-4 z-10 size-4 -translate-y-1/2 opacity-50" />

            <input
              /* Spread rather than picked apart: `field` carries a ref, and
                 reading its properties one by one during render is what the
                 compiler's ref rule objects to. The ref is worth keeping — it's
                 how a failed Next focuses this input rather than silently
                 refusing to move. */
              {...field}
              type="text"
              value={formatted}
              onChange={(event) => change(event.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => suggestions.length > 0 && setIsOpen(true)}
              placeholder="Königstraße 12, 90402 Nürnberg"
              /* The browser's own address autofill would cover this list with a
                 second one. */
              autoComplete="off"
              role="combobox"
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
              }
              aria-invalid={errors.address ? true : undefined}
              className={`input w-full pl-11 ${errors.address ? 'input-error' : ''}`}
            />
          </div>
        </JamField>

        {showList && (
          /* Absolutely positioned so the map below doesn't jump down and back on
             every keystroke. z-20 clears it — the map is a stacking context of
             its own, see the `isolate` note in VenueMap, and without both halves
             of that arrangement the list renders *behind* the map. */
          <div className="absolute inset-x-0 top-full z-20 -mt-4 overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xl">
            <ul id={listId} ref={listRef} role="listbox" className="max-h-72 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  /* mousedown, not click: the default would blur the input and
                     close the list out from under the pointer before the click
                     ever landed. */
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(suggestion)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex cursor-pointer items-start gap-3 px-4 py-3 text-sm ${
                    index === activeIndex ? 'bg-primary text-primary-content' : ''
                  }`}
                >
                  <FaLocationDot className="mt-0.5 size-4 shrink-0 opacity-60" />

                  <span className="min-w-0">
                    <span className="block font-medium">{suggestion.primary}</span>
                    {suggestion.secondary && (
                      <span
                        className={`block text-xs ${
                          index === activeIndex ? 'opacity-80' : 'opacity-60'
                        }`}
                      >
                        {suggestion.secondary}
                      </span>
                    )}
                  </span>
                </li>
              ))}

              {status === 'searching' && suggestions.length === 0 && (
                <li className="flex items-center gap-3 px-4 py-3 text-sm opacity-60">
                  <span className="loading loading-spinner loading-xs" />
                  Looking for that address…
                </li>
              )}

              {status === 'ready' && suggestions.length === 0 && (
                <li className="px-4 py-3 text-sm opacity-60">
                  No match on the map — type the address out and post it anyway.
                </li>
              )}

              {status === 'failed' && (
                <li className="px-4 py-3 text-sm opacity-60">
                  Address lookup isn&apos;t answering. Type the address out — the
                  session just won&apos;t carry a map pin.
                </li>
              )}
            </ul>

            {/* Their data, their credit — and the tiles below say the same. */}
            <p className="border-t border-base-300 px-4 py-2 text-right text-xs opacity-50">
              Addresses from OpenStreetMap
            </p>
          </div>
        )}
      </div>

      {/* Always rendered, pin or no pin. An empty map is what makes the list
          worth using — it shows the venue what picking a suggestion buys them,
          at the moment they're deciding whether to bother. */}
      {/* The map and its note are one block, so they go in one wrapper rather
          than as two children of the `space-y-3` above — the gap that rule puts
          between siblings is exactly what shouldn't be here. The map squares its
          bottom corners to meet the note, and keeps them when there is no note
          to meet. */}
      <div>
        <VenueMap
          lat={lat}
          lng={lng}
          label={hasPin ? formatted : undefined}
          frameClass={
            hasPin
              ? 'rounded-t-box border border-b-0 border-base-300'
              : 'rounded-box border border-base-300'
          }
          /* The typed address stays exactly as it is: what the venue is
             correcting by dragging is where on the block the door is, which is a
             thing the geocoder gets wrong for a back entrance and a thing the
             text can't say. Only the coordinates move. */
          onPinMove={(movedLat, movedLng) =>
            field.onChange({ formatted, lat: movedLat, lng: movedLng })
          }
        />

        {/* Only once there is a pin to drag — before that the sentence describes
            a control that isn't there. The page's own pale blue, so the strip
            reads as the map's caption rather than as another grey panel. */}
        {hasPin && (
          <p className="flex items-center gap-2 rounded-b-box border border-t-0 border-base-300 bg-pale-blue px-4 py-3 text-xs text-brand-navy/60">
            <IoLocationOutline
              aria-hidden
              className="size-4 shrink-0 text-royal-blue"
            />
            Drag the pin if the door is somewhere else on the block.
          </p>
        )}
      </div>

      {!hasPin && formatted.trim().length > 0 && (
        <p className="fieldset-label">
          No pin for this one — the address is saved exactly as you typed it.
        </p>
      )}
    </div>
  );
}
