'use client';

import { useController } from 'react-hook-form';

import { GENRE_LABELS, SKILL_LEVEL_LABELS } from '@/config/jamOptions';
import { useJamForm } from '@/hooks/useJamForm';
import {
  ALL_GENRES,
  ALL_LEVELS,
  genres,
  skillLevels,
  type Genre,
  type SkillLevel,
} from '@/schemas/jamSession';

/* Who the session is for. Two chip rows with the same behaviour, which is the
   reason they share a step at all.

   Both lists open with a catch-all — "All genres", "All levels" — and the API
   treats it as exclusive: `["all-genres", "jazz"]` is a contradiction rather
   than a wider net, and comes back a 400. So the toggle enforces it here, where
   the venue can see it happen: picking the catch-all clears the specifics, and
   picking a specific one drops the catch-all. Nothing is ever silently in a
   state the API would refuse. */

const toggleTag = <T extends string>(
  selected: readonly T[],
  value: T,
  catchAll: T,
): T[] => {
  if (value === catchAll) {
    /* Tapping the catch-all a second time clears the row rather than leaving it
       stuck on — every other chip here deselects, and one that can't would be
       the odd one out. The empty row is then a field error, which is honest:
       nothing is chosen. */
    return selected.includes(catchAll) ? [] : [catchAll];
  }

  if (selected.includes(value)) return selected.filter((tag) => tag !== value);

  return [...selected.filter((tag) => tag !== catchAll), value];
};

type TagRowProps<T extends string> = {
  legend: string;
  options: readonly T[];
  labels: Record<T, string>;
  catchAll: T;
  selected: readonly T[];
  error?: string;
  onToggle: (value: T) => void;
};

const TagRow = <T extends string>({
  legend,
  options,
  labels,
  catchAll,
  selected,
  error,
  onToggle,
}: TagRowProps<T>) => (
  <fieldset className="fieldset">
    <legend className="fieldset-legend">{legend}</legend>

    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);

        return (
          <button
            key={option}
            type="button"
            /* aria-pressed, not a checkbox: these read as toggle buttons, and a
               screen reader announces the on/off state without needing a
               visually hidden input under every chip. */
            aria-pressed={isSelected}
            onClick={() => onToggle(option)}
            className={`btn btn-sm ${chipClass(isSelected, option === catchAll)}`}
          >
            {labels[option]}
          </button>
        );
      })}
    </div>

    {error && (
      <p role="alert" className="fieldset-label text-error">
        {error}
      </p>
    )}
  </fieldset>
);

/* The catch-all wears the lime accent rather than the indigo: it isn't one more
   choice in the row, it's the answer that replaces the row. */
const chipClass = (isSelected: boolean, isCatchAll: boolean): string => {
  if (!isSelected) return 'btn-outline';

  return isCatchAll ? 'btn-accent' : 'btn-primary';
};

export default function TagsStep() {
  const {
    control,
    trigger,
    formState: { errors },
  } = useJamForm();

  const { field: genreField } = useController({ control, name: 'genres' });
  const { field: levelField } = useController({ control, name: 'skillLevel' });

  /* Chips are clicked, never blurred, so the form's own onTouched re-validation
     never fires for them — without this the "choose at least one" message would
     linger after the first chip was picked. */
  const change = <T extends string>(
    field: { value: readonly T[]; onChange: (next: T[]) => void },
    name: 'genres' | 'skillLevel',
    value: T,
    catchAll: T,
  ) => {
    field.onChange(toggleTag(field.value, value, catchAll));
    void trigger(name);
  };

  return (
    <div className="space-y-4">
      <TagRow<Genre>
        legend="Genres*"
        options={genres}
        labels={GENRE_LABELS}
        catchAll={ALL_GENRES}
        selected={genreField.value}
        error={errors.genres?.message ?? errors.genres?.root?.message}
        onToggle={(value) => change(genreField, 'genres', value, ALL_GENRES)}
      />

      <TagRow<SkillLevel>
        legend="Skill levels*"
        options={skillLevels}
        labels={SKILL_LEVEL_LABELS}
        catchAll={ALL_LEVELS}
        selected={levelField.value}
        error={errors.skillLevel?.message ?? errors.skillLevel?.root?.message}
        onToggle={(value) => change(levelField, 'skillLevel', value, ALL_LEVELS)}
      />

      <p className="fieldset-label">
        These are what musicians filter the listings by, so pick what the night
        actually is rather than everything it could tolerate.
      </p>
    </div>
  );
}
