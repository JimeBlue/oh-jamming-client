'use client';

import { useWatch } from 'react-hook-form';
import { useJamForm } from '@/hooks/useJamForm';
import { MAX_SUMMARY_CHARS } from '@/schemas/jamSession';
import { generateJamSummary } from '@/services/ai';
import AiAssistedField from './AiAssistedField';
import JamField from './JamField';
import JamNote from './JamNote';

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

      {/* The same two tabs as the overview on step 4, and deliberately the same
          component: a venue who has met this control once should not have to
          work out whether it behaves differently here.

          What it writes is a different job, though, not a shorter overview — the
          API is asked for a pitch, and told to pick the one or two things most
          likely to make someone come rather than to compress everything. The two
          sit next to each other on the listing, so an overview restated in
          miniature above itself is wasted space. */}
      <AiAssistedField
        label="Short description*"
        error={errors.summary?.message}
        manualHint={
          <span className="flex w-full justify-between gap-4">
            <span>The one-line pitch. House kit? PA? Who it&apos;s for?</span>
            {/* Counts up rather than down: at 40 of 500 the useful number is how
                much has been written, and it only becomes a warning near the
                end, which is where the colour change comes in. */}
            <span
              className={summary.length > MAX_SUMMARY_CHARS ? 'text-error' : 'opacity-60'}
            >
              {summary.length}/{MAX_SUMMARY_CHARS}
            </span>
          </span>
        }
        notesHint="Rough notes are enough — it picks what sells the night."
        notesPlaceholder={
          'A few bullet points or a short paragraph, e.g.\n' +
          '- blues and soul, house band opens\n' +
          '- full backline, bring your own guitar\n' +
          '- first-timers welcome, free to play'
        }
        notesName="summaryNotes"
        targetName="summary"
        generate={generateJamSummary}
        /* Unkeyed, unlike the overview's editor: a registered textarea is
           controlled by react-hook-form and re-renders with the new value on its
           own. The id is accepted and ignored. */
        renderManual={() => (
          <textarea
            {...register('summary')}
            rows={3}
            aria-invalid={errors.summary ? true : undefined}
            className={`textarea w-full ${errors.summary ? 'textarea-error' : ''}`}
          />
        )}
      />

      <JamNote>
        Musicians see the title and first line on the session card. Say
        what&apos;s provided and who it&apos;s for.
      </JamNote>
    </div>
  );
}
