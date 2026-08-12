'use client';

import { useController, useWatch } from 'react-hook-form';
import { IoInformationCircle } from 'react-icons/io5';

import { SLOT_DURATION_OPTIONS } from '@/config/jamOptions';
import { useJamForm } from '@/hooks/useJamForm';
import { buildSlotPlan, formatMinutes } from '@/lib/slotPlan';
import { isTime, timeToMinutes } from '@/lib/time';
import { MAX_SLOTS_PER_SESSION } from '@/schemas/jamSession';
import JamField from './JamField';

/* How the evening gets cut up.

   The rule that shapes this whole step: the API rejects a slot length that
   leaves a remainder — 19:00–21:30 in 45-minute slots is a 400, not a session
   with a 15-minute stub on the end. So the lengths that don't fit are turned off
   rather than allowed and then argued with. A venue that wants 45-minute slots
   changes the end time, which is a decision they can actually make. */
export default function SlotsStep() {
  const {
    control,
    formState: { errors },
  } = useJamForm();

  const [startTime, endTime] = useWatch({
    control,
    name: ['startTime', 'endTime'],
  });

  /* useController rather than register: this is a group of buttons holding a
     number, not an input holding a string, and register would hand back "45". */
  const { field } = useController({ control, name: 'slotDurationMinutes' });

  const windowMinutes =
    isTime(startTime) && isTime(endTime)
      ? timeToMinutes(endTime) - timeToMinutes(startTime)
      : 0;

  const hasWindow = windowMinutes > 0;
  const plan = buildSlotPlan(startTime, endTime, field.value);

  const fits = (minutes: number) =>
    hasWindow &&
    windowMinutes % minutes === 0 &&
    windowMinutes / minutes <= MAX_SLOTS_PER_SESSION;

  if (!hasWindow) {
    return (
      <div
        role="note"
        className="flex gap-3 rounded-box border border-primary/40 bg-primary/10 p-4"
      >
        <IoInformationCircle className="size-6 shrink-0 text-primary" />
        <p className="text-sm">
          Set the start and end times on the previous step first — which slot
          lengths are possible depends entirely on how long the session runs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <JamField
        label="Slot length*"
        error={errors.slotDurationMinutes?.message}
        hint={`Only lengths that divide ${formatMinutes(windowMinutes)} exactly are available.`}
      >
        {/* A radio group rather than buttons: one of these is always chosen, and
            arrow keys should move between them. The inputs are visually hidden
            and the label carries the styling, so keyboard focus and the click
            target stay on the real control. */}
        <div className="flex flex-wrap gap-2">
          {SLOT_DURATION_OPTIONS.map((minutes) => {
            const isAvailable = fits(minutes);
            const isSelected = field.value === minutes;

            return (
              <label
                key={minutes}
                className={`btn ${optionClass(isSelected, isAvailable)}`}
              >
                <input
                  type="radio"
                  name="slotDurationMinutes"
                  className="sr-only"
                  checked={isSelected}
                  disabled={!isAvailable}
                  onChange={() => field.onChange(minutes)}
                  onBlur={field.onBlur}
                />
                {minutes} min
              </label>
            );
          })}
        </div>
      </JamField>

      {plan && (
        <div className="rounded-box border border-base-300 p-4">
          <p className="text-sm">
            <span className="font-bold">{plan.slots.length} slots</span> of{' '}
            {field.value} minutes, back to back.
          </p>

          {/* The actual boundaries, because "6 slots" and "19:00, 19:30, 20:00…"
              are not equally easy to check against what the venue had in mind.
              The API generates the real ones — this is the same arithmetic shown
              early, not a second source of truth. */}
          <ul className="mt-3 flex flex-wrap gap-2">
            {plan.slots.map((slot) => (
              <li
                key={slot.startTime}
                className="rounded-field bg-base-200 px-3 py-1 text-sm tabular-nums"
              >
                {slot.startTime} – {slot.endTime}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* Selected-but-impossible is a real state: the window can change on the previous
   step after a length was already chosen. It stays visibly selected — hiding
   which one is picked would make the error underneath unreadable — but wears the
   error colour instead of the brand one. */
const optionClass = (isSelected: boolean, isAvailable: boolean): string => {
  if (isSelected) return isAvailable ? 'btn-primary' : 'btn-outline btn-error';

  return isAvailable ? 'btn-outline' : 'btn-outline btn-disabled';
};
