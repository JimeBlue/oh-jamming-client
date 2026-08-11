'use client';

import { useController } from 'react-hook-form';

import { useJamForm } from '@/hooks/useJamForm';
import { MAX_OVERVIEW_CHARS } from '@/schemas/jamSession';
import JamField from './JamField';
import MarkdownEditor from './MarkdownEditor';

/* The long version — house rules, backline, how the night actually runs.

   The value here is markdown, and was markdown when this step was a plain
   textarea: what phase 5 added is a toolbar over the same string, not a
   different one. Nothing typed before the editor landed needed migrating.

   Optional, and the only step in the wizard that is. The API defaults `overview`
   to an empty array, and a blank one is dropped rather than sent as an empty
   block — see `toJamSessionPayload`. */
export default function OverviewStep() {
  const {
    control,
    formState: { errors },
  } = useJamForm();

  const { field } = useController({ control, name: 'overview' });

  return (
    <JamField
      label="Session overview"
      error={errors.overview?.message}
      hint={
        <span className="flex w-full justify-between gap-4">
          <span>Optional. Anything a musician should know before they turn up.</span>
          {/* Counts the markdown, because that is what the API measures against
              its 2000-character limit — the asterisks around a bold word are
              part of the length even though nobody sees them. */}
          <span
            className={
              field.value.length > MAX_OVERVIEW_CHARS ? 'text-error' : 'opacity-60'
            }
          >
            {field.value.length}/{MAX_OVERVIEW_CHARS}
          </span>
        </span>
      }
    >
      <MarkdownEditor
        defaultValue={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        invalid={errors.overview !== undefined}
      />
    </JamField>
  );
}
