'use client';

import { useWatch } from 'react-hook-form';

import { useJamForm } from '@/hooks/useJamForm';
import { MAX_OVERVIEW_CHARS } from '@/schemas/jamSession';
import JamField from './JamField';

/* The long version — house rules, backline, how the night actually runs.

   A plain textarea for now. The field is markdown either way: what phase 5 adds
   is a toolbar and a live rendering of it, not a different value, so nothing
   typed here has to be migrated when the editor lands.

   Optional, and the only step in the wizard that is. The API defaults `overview`
   to an empty array, and a blank one is dropped rather than sent as an empty
   block — see `toJamSessionPayload`. */
export default function OverviewStep() {
  const {
    register,
    control,
    formState: { errors },
  } = useJamForm();

  const overview = useWatch({ control, name: 'overview' });

  return (
    <JamField
      label="Session overview"
      error={errors.overview?.message}
      hint={
        <span className="flex w-full justify-between gap-4">
          <span>Optional. Anything a musician should know before they turn up.</span>
          <span
            className={
              overview.length > MAX_OVERVIEW_CHARS ? 'text-error' : 'opacity-60'
            }
          >
            {overview.length}/{MAX_OVERVIEW_CHARS}
          </span>
        </span>
      }
    >
      <textarea
        {...register('overview')}
        rows={10}
        placeholder={
          'House kit is a Pearl Export with cymbals.\nBring your own snare if you’re fussy.\n\nOne song each, no long solos.'
        }
        aria-invalid={errors.overview ? true : undefined}
        className={`textarea w-full ${errors.overview ? 'textarea-error' : ''}`}
      />
    </JamField>
  );
}
