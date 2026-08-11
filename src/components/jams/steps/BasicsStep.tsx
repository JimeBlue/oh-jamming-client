'use client';

import { useWatch } from 'react-hook-form';

import { useJamForm } from '@/hooks/useJamForm';
import JamField from './JamField';

const MAX_SUMMARY = 500;

/* Title and summary — the two lines a musician reads in a list before deciding
   whether to open the session at all. */
export default function BasicsStep() {
  const {
    register,
    control,
    formState: { errors },
  } = useJamForm();

  /* Scoped to this one field, so typing in the summary re-renders this step and
     nothing else. `useWatch` with no name would subscribe to the whole form and
     re-render on every keystroke in every field. */
  const summary = useWatch({ control, name: 'summary' });

  return (
    <div className="space-y-2">
      <JamField
        label="Session title*"
        error={errors.title?.message}
        hint="What you'd put on the poster — “Wednesday Night Jam”, “Blues Basement”."
      >
        <input
          {...register('title')}
          type="text"
          aria-invalid={errors.title ? true : undefined}
          className={`input w-full ${errors.title ? 'input-error' : ''}`}
        />
      </JamField>

      <JamField
        label="Short description*"
        error={errors.summary?.message}
        hint={
          <span className="flex w-full justify-between gap-4">
            <span>The one-line pitch. House kit? PA? Who it&apos;s for?</span>
            {/* Counts up rather than down: at 40 of 500 the useful number is how
                much has been written, and it only becomes a warning near the
                end, which is where the colour change comes in. */}
            <span
              className={summary.length > MAX_SUMMARY ? 'text-error' : 'opacity-60'}
            >
              {summary.length}/{MAX_SUMMARY}
            </span>
          </span>
        }
      >
        <textarea
          {...register('summary')}
          rows={3}
          aria-invalid={errors.summary ? true : undefined}
          className={`textarea w-full ${errors.summary ? 'textarea-error' : ''}`}
        />
      </JamField>
    </div>
  );
}
