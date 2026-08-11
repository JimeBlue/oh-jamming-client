'use client';

import { useWatch } from 'react-hook-form';

import { useJamForm } from '@/hooks/useJamForm';
import { formatMinutes } from '@/lib/slotPlan';
import { isTime, nowInAppTimezone, timeToMinutes } from '@/lib/time';
import JamField from './JamField';

/* Date, times, and where the room is.

   Four fields that the two later steps both depend on: the slot lengths on offer
   are decided by how long this window is, and the total spot count by how many
   slots come out of it. */
export default function WhenStep() {
  const {
    register,
    control,
    formState: { errors },
  } = useJamForm();

  const [startTime, endTime] = useWatch({
    control,
    name: ['startTime', 'endTime'],
  });

  /* Berlin's today, not the browser's. A musician in Lisbon opening this at
     00:30 is still on yesterday's date locally, and the API would reject what
     their own clock said was fine. */
  const today = nowInAppTimezone().date;

  const windowMinutes =
    isTime(startTime) && isTime(endTime)
      ? timeToMinutes(endTime) - timeToMinutes(startTime)
      : null;

  return (
    <div className="space-y-2">
      <JamField
        label="Date*"
        error={errors.date?.message}
        hint="Sessions run within a single day — a night ending after midnight has to be posted as two."
      >
        <input
          {...register('date')}
          type="date"
          /* Stops the past being offered at all in the date picker. The schema
             checks it too: `min` is a suggestion to the widget, and typing into
             the field goes straight past it in several browsers. */
          min={today}
          aria-invalid={errors.date ? true : undefined}
          className={`input w-full ${errors.date ? 'input-error' : ''}`}
        />
      </JamField>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <JamField label="Starts at*" error={errors.startTime?.message}>
          <input
            {...register('startTime')}
            type="time"
            aria-invalid={errors.startTime ? true : undefined}
            className={`input w-full ${errors.startTime ? 'input-error' : ''}`}
          />
        </JamField>

        <JamField label="Ends at*" error={errors.endTime?.message}>
          <input
            {...register('endTime')}
            type="time"
            aria-invalid={errors.endTime ? true : undefined}
            className={`input w-full ${errors.endTime ? 'input-error' : ''}`}
          />
        </JamField>
      </div>

      {/* Only once the window makes sense. While it doesn't, the error under the
          end time is already saying so, and a second line repeating it in other
          words is noise. */}
      {windowMinutes !== null && windowMinutes > 0 && (
        <p className="text-sm opacity-70">
          That&apos;s{' '}
          <span className="font-medium opacity-100">
            {formatMinutes(windowMinutes)}
          </span>{' '}
          of playing time to divide into slots.
        </p>
      )}

      <JamField
        label="Venue name*"
        error={errors.venueName?.message}
        hint="The room, not your account name — a promoter running nights in three places needs all three."
      >
        <input
          {...register('venueName')}
          type="text"
          aria-invalid={errors.venueName ? true : undefined}
          className={`input w-full ${errors.venueName ? 'input-error' : ''}`}
        />
      </JamField>

      <JamField
        label="Address*"
        /* The pairing rule reports on `address.lat`. It can't fire from this
           step — nothing here sets coordinates — but a draft saved once the
           autocomplete lands could carry a half-filled pair into it, and an
           error with nowhere to appear is an error nobody can fix. */
        error={errors.address?.formatted?.message ?? errors.address?.lat?.message}
        hint="Street, number, postcode and city."
      >
        <input
          {...register('address.formatted')}
          type="text"
          autoComplete="off"
          placeholder="Königstraße 12, 90402 Nürnberg"
          aria-invalid={errors.address?.formatted ? true : undefined}
          className={`input w-full ${errors.address?.formatted ? 'input-error' : ''}`}
        />
      </JamField>
    </div>
  );
}
