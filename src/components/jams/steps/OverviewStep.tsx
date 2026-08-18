'use client';

import { useController } from 'react-hook-form';

import { useJamForm } from '@/hooks/useJamForm';
import { MAX_OVERVIEW_CHARS } from '@/schemas/jamSession';
import { generateJamOverview } from '@/services/ai';
import AiAssistedField from './AiAssistedField';
import JamNote from './JamNote';
import MarkdownEditor from './MarkdownEditor';

/* The long version — house rules, backline, how the night actually runs.

   The value here is markdown, and was markdown when this step was a plain
   textarea: what phase 5 added is a toolbar over the same string, and what phase
   8 adds is a second way to produce it. Nothing typed before either landed
   needed migrating.

   Optional, and the only step in the wizard that is. The API defaults `overview`
   to an empty array, and a blank one is dropped rather than sent as an empty
   block — see `toJamSessionPayload`. */
export default function OverviewStep() {
  const {
    control,
    formState: { errors },
  } = useJamForm();

  const { field: overview } = useController({ control, name: 'overview' });

  return (
    <div>
      <AiAssistedField
        label="Session overview"
        error={errors.overview?.message}
        manualHint={
          <span className="flex w-full justify-between gap-4">
            <span>
              Optional. Anything a musician should know before they turn up.
            </span>
            {/* Counts the markdown, because that is what the API measures against
                its 2000-character limit — the asterisks around a bold word are
                part of the length even though nobody sees them. */}
            <span
              className={
                overview.value.length > MAX_OVERVIEW_CHARS
                  ? 'text-error'
                  : 'opacity-60'
              }
            >
              {overview.value.length}/{MAX_OVERVIEW_CHARS}
            </span>
          </span>
        }
        notesHint="Rough notes are enough — it writes from what you give it."
        notesPlaceholder={
          'A few bullet points or a short paragraph, e.g.\n' +
          '- house band opens, then the floor is open\n' +
          '- backline: drum kit, bass amp, two guitar amps\n' +
          '- bring your own guitar, first-timers welcome'
        }
        notesName="overviewNotes"
        targetName="overview"
        generate={generateJamOverview}
        /* Keyed, because the editor reads its value only at mount — see the note
           on `generationId`. Without this a generation would change the form and
           leave the editor showing the previous text. */
        renderManual={(generationId) => (
          <MarkdownEditor
            key={generationId}
            defaultValue={overview.value}
            onChange={overview.onChange}
            onBlur={overview.onBlur}
            invalid={errors.overview !== undefined}
            /* An example rather than an instruction. "Anything a musician should
               know" is the hint under the field, and it doesn't help someone
               staring at an empty box; a written-out night shows the register
               and the level of detail in the space it takes to describe them. */
            placeholder="Doors at 19:00, sign-up sheet by the bar. House kit, bass rig and two guitar amps are on stage — bring pedals and sticks if you're fussy. Three tunes each, then swap."
          />
        )}
      />

      <JamNote>
        Backline, sign-up, slot length and house rules answer most of what
        players message you about.
      </JamNote>
    </div>
  );
}
