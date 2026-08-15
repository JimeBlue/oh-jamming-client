'use client';

import { useEffect, useState } from 'react';

import { GENRE_LABELS, SKILL_LEVEL_LABELS } from '@/config/jamOptions';
import {
  ALL_GENRES,
  ALL_LEVELS,
  genres,
  skillLevels,
  type Genre,
  type SkillLevel,
} from '@/schemas/jamSession';
import { type JamSessionQuery, getJamCities } from '@/services/jamSessions';

/* The manual half of the search: the same four filters the AI writes, as
   controls.

   Selects rather than checkbox lists, and that is the API's shape showing
   through rather than a style choice. `?genre=jazz` takes one value — a
   multi-select here would let someone tick Jazz and Funk and then silently drop
   one of them, which is the kind of wrong that never looks like a bug. One value
   each, said in a control that can only hold one.

   The catch-alls are not offered. Filtering by "all genres" would match only the
   sessions tagged with the catch-all and hide every session with a real genre on
   it — the exact opposite of what picking it reads like. "Any" is the empty
   option, which is the same thing said in the one way that works. */

const FILTERABLE_GENRES = genres.filter((genre) => genre !== ALL_GENRES);
const FILTERABLE_LEVELS = skillLevels.filter((level) => level !== ALL_LEVELS);

/* Local calendar days, formatted the way the API reads them. Not `toISOString`,
   which converts to UTC first and hands back yesterday for anyone typing after
   midnight in a positive offset — the single most common way a date filter ends
   up one day out. */
const toDateString = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
};

type DateRange = { from?: string; to?: string };

/* Computed on each render rather than at module load, because a tab left open
   overnight would otherwise still think "today" is yesterday. */
const datePresets = (): { id: string; label: string; range: DateRange }[] => {
  const today = new Date();
  const day = today.getDay();

  /* Saturday and Sunday, or the rest of the weekend if it has already started —
     someone searching on a Saturday afternoon means tonight and tomorrow, not
     six days from now. */
  const daysToSaturday = day === 0 ? 0 : 6 - day;
  const weekendStart = day === 0 || day === 6 ? today : addDays(today, daysToSaturday);
  const weekendEnd = day === 0 ? today : addDays(today, daysToSaturday + 1);

  return [
    { id: 'any', label: 'Any date', range: {} },
    { id: 'today', label: 'Today', range: { from: toDateString(today), to: toDateString(today) } },
    {
      id: 'tomorrow',
      label: 'Tomorrow',
      range: { from: toDateString(addDays(today, 1)), to: toDateString(addDays(today, 1)) },
    },
    {
      id: 'weekend',
      label: 'This weekend',
      range: { from: toDateString(weekendStart), to: toDateString(weekendEnd) },
    },
    {
      id: 'week',
      label: 'Next 7 days',
      range: { from: toDateString(today), to: toDateString(addDays(today, 6)) },
    },
  ];
};

type JamFiltersProps = {
  filters: JamSessionQuery;
  onChange: (filters: JamSessionQuery) => void;
};

export default function JamFilters({ filters, onChange }: JamFiltersProps) {
  const [cities, setCities] = useState<string[]>([]);

  /* Opened by choosing "Custom range", and it has to be its own state: the
     derived id below already says whether the *current* range matches a preset,
     but someone who has just picked Custom has not typed any dates yet, so the
     range still matches "Any" and the inputs would close under them. */
  const [customOpen, setCustomOpen] = useState(false);

  useEffect(() => {
    let active = true;

    getJamCities()
      .then((result) => {
        if (active) setCities(result);
      })
      /* Swallowed on purpose. The city list is one of four filters and the only
         one that needs a second request — losing it should cost the dropdown its
         options, not put an error over a page that otherwise works. It comes back
         on the next visit. */
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const presets = datePresets();

  /* Derived from the filters rather than held beside them, which is what lets an
     AI search fill these controls in: "jazz jam this weekend" sets from and to,
     and the select finds itself on "This weekend" without anything being told.
     Held as its own state it would need an effect to stay in step, and would
     drift the first time it didn't fire. */
  const activePreset =
    presets.find(
      ({ range }) => (range.from ?? '') === (filters.from ?? '') && (range.to ?? '') === (filters.to ?? ''),
    )?.id ?? 'custom';

  const showCustom = customOpen || activePreset === 'custom';

  /* Merged, then emptied of the keys that mean "no filter". An empty select
     hands back "" and `?genre=` is an unknown genre to the API rather than no
     genre — a 400 for the whole request, since its query schema is strict. */
  const update = (patch: JamSessionQuery) => {
    const merged = { ...filters, ...patch };

    onChange(
      Object.fromEntries(Object.entries(merged).filter(([, value]) => Boolean(value))),
    );
  };

  /* No visible labels, and the empty option carries the name instead — "Any
     city", "Any genre". Two things fall out of it: the row is the same height as
     the AI tab's input, so the two panels sit in the same place under the tabs
     rather than jumping when you switch; and a select showing "Any genre" needs
     no label to say what it is, while one showing "Jazz" has already answered
     the question a label would ask. `aria-label` carries the name for anyone who
     isn't reading the option. */
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        aria-label="Date"
        className="select select-primary w-40"
        value={showCustom ? 'custom' : activePreset}
        onChange={(event) => {
          const chosen = event.target.value;

          if (chosen === 'custom') {
            setCustomOpen(true);
            return;
          }

          setCustomOpen(false);
          /* Both keys named explicitly, including when the preset carries
             neither — `update` only overwrites what it is given, so leaving them
             out would keep the previous range alive under "Any date". */
          update({
            from: presets.find(({ id }) => id === chosen)?.range.from,
            to: presets.find(({ id }) => id === chosen)?.range.to,
          });
        }}
      >
        {presets.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
        <option value="custom">Custom range…</option>
      </select>

      {showCustom && (
        <>
          <input
            type="date"
            aria-label="From"
            className="input input-primary w-40"
            value={filters.from ?? ''}
            /* Nothing stops a range ending before it starts, because the API
               already refuses that with a message worth reading and this control
               cannot know which of the two dates was the mistake. */
            onChange={(event) => update({ from: event.target.value })}
          />

          <span aria-hidden className="opacity-60">
            to
          </span>

          <input
            type="date"
            aria-label="To"
            className="input input-primary w-40"
            value={filters.to ?? ''}
            onChange={(event) => update({ to: event.target.value })}
          />
        </>
      )}

      <select
        aria-label="City"
        className="select select-primary w-40"
        value={filters.city ?? ''}
        onChange={(event) => update({ city: event.target.value })}
      >
        <option value="">Any city</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>

      <select
        aria-label="Genre"
        className="select select-primary w-40"
        value={filters.genre ?? ''}
        onChange={(event) => update({ genre: event.target.value as Genre })}
      >
        <option value="">Any genre</option>
        {FILTERABLE_GENRES.map((genre) => (
          <option key={genre} value={genre}>
            {GENRE_LABELS[genre]}
          </option>
        ))}
      </select>

      <select
        aria-label="Level"
        className="select select-primary w-40"
        value={filters.skillLevel ?? ''}
        onChange={(event) => update({ skillLevel: event.target.value as SkillLevel })}
      >
        <option value="">Any level</option>
        {FILTERABLE_LEVELS.map((level) => (
          <option key={level} value={level}>
            {SKILL_LEVEL_LABELS[level]}
          </option>
        ))}
      </select>
    </div>
  );
}
