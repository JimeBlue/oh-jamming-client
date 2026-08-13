'use client';

import { useState } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import { FaMinus, FaPlus } from 'react-icons/fa6';

import { useJamForm } from '@/hooks/useJamForm';
import { buildSlotPlan } from '@/lib/slotPlan';
import {
  MAX_SPOTS_PER_INSTRUMENT,
  MAX_SPOTS_PER_SESSION,
} from '@/schemas/jamSession';
import JamField from './JamField';

/* Who's needed on stage, and how many of each.

   The number here is per *slot*, not per session: three guitar spots across six
   slots is eighteen bookable places, and the API builds every one of them. That
   multiplication is why this step shows a running total — 20 spots typed
   thoughtlessly against 24 slots is 480, well past the 300 the API allows, and
   finding that out at the publish button would be a poor trade for the four
   minutes spent getting here. */
export default function InstrumentsStep() {
  const {
    control,
    register,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useJamForm();

  /* No `remove`. A row can be taken out of the line-up by setting it to zero,
     which is reversible; deleting it isn't — the preset names aren't listed
     anywhere else in the step, so a venue who removed "Saxophone" and changed
     their mind would have to know to type it back. Zero and gone mean the same
     thing to the payload (see `toJamSessionPayload`), so the destructive one
     buys nothing. */
  const { fields, append } = useFieldArray({
    control,
    name: 'instrumentTemplate',
  });

  const [startTime, endTime, slotDurationMinutes, rows] = useWatch({
    control,
    name: ['startTime', 'endTime', 'slotDurationMinutes', 'instrumentTemplate'],
  });

  const [newInstrument, setNewInstrument] = useState('');

  const plan = buildSlotPlan(startTime, endTime, slotDurationMinutes);
  const spotsPerSlot = rows.reduce((total, row) => total + row.spotsTotal, 0);
  const totalSpots = plan ? spotsPerSlot * plan.slots.length : null;

  /* Reads the live value rather than the rendered one. Two taps on + inside the
     same frame would otherwise both start from the number on screen and land on
     the same result — the second increment simply lost. `getValues` goes to the
     form store, which is already updated by then. */
  const stepSpots = (index: number, delta: number) => {
    const path = `instrumentTemplate.${index}.spotsTotal` as const;
    const next = getValues(path) + delta;

    setValue(path, Math.min(Math.max(next, 0), MAX_SPOTS_PER_INSTRUMENT), {
      shouldDirty: true,
    });

    /* A press is never followed by a blur, so nothing else would re-check the
       line-up: "add at least one instrument" would stay on screen after the
       instrument was added, and the spot total could sail past 300 in silence. */
    void trigger('instrumentTemplate');
  };

  const addInstrument = () => {
    const instrument = newInstrument.trim();

    if (!instrument) return;

    /* One spot, not zero. Someone who has just typed "Trumpet" and pressed Add
       has already said they want one — making them press + as well would be
       asking the same question twice. */
    append({ instrument, spotsTotal: 1 });
    setNewInstrument('');
    void trigger('instrumentTemplate');
  };

  /* A rule broken by the line-up as a whole — nothing left in it, the same
     instrument twice, too many spots once multiplied out — is reported on the
     array itself rather than on a row. */
  const lineUpError =
    errors.instrumentTemplate?.message ?? errors.instrumentTemplate?.root?.message;

  return (
    <div className="space-y-6">
      <div>
        <ul className="space-y-2">
          {fields.map((row, index) => {
            const spots = rows[index]?.spotsTotal ?? 0;
            /* From the watched values, not from `row` — useFieldArray's snapshot
               keeps the name the row was created with, so a renamed instrument
               would keep announcing its old name. */
            const name = rows[index]?.instrument.trim();
            const nameError = errors.instrumentTemplate?.[index]?.instrument?.message;

            return (
              <li
                key={row.id}
                className={`flex items-center gap-3 rounded-box border p-3 ${
                  spots > 0 ? 'border-primary/50 bg-primary/5' : 'border-base-300'
                }`}
              >
                {/* Editable rather than fixed text: the presets are a starting
                    point, and a venue whose kit is a "Rhodes" shouldn't have to
                    delete "Keyboard" and add a row to say so. */}
                <input
                  {...register(`instrumentTemplate.${index}.instrument`)}
                  type="text"
                  aria-label={`Instrument ${index + 1}`}
                  className={`input input-ghost min-w-0 flex-1 ${
                    nameError ? 'input-error' : ''
                  }`}
                />

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => stepSpots(index, -1)}
                    disabled={spots === 0}
                    aria-label={`One fewer ${name || 'instrument'} spot`}
                    className="btn btn-circle btn-outline btn-sm"
                  >
                    <FaMinus className="size-3" />
                  </button>

                  {/* aria-live so the new number is announced after a press —
                      without it a screen reader user hears the button label
                      again and nothing about what changed. */}
                  <span
                    aria-live="polite"
                    className="w-8 text-center font-bold tabular-nums"
                  >
                    {spots}
                  </span>

                  <button
                    type="button"
                    onClick={() => stepSpots(index, 1)}
                    disabled={spots >= MAX_SPOTS_PER_INSTRUMENT}
                    aria-label={`One more ${name || 'instrument'} spot`}
                    className="btn btn-circle btn-outline btn-sm"
                  >
                    <FaPlus className="size-3" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Row-level name errors are rendered against their own input above; this
            is the line-up's own message. */}
        {lineUpError && (
          <p role="alert" className="fieldset-label mt-2 text-error">
            {lineUpError}
          </p>
        )}

        <p className="fieldset-label mt-2">
          Instruments left at zero aren&apos;t offered — they don&apos;t reach the
          session at all.
        </p>
      </div>

      <JamField
        label="Add another instrument"
        hint={`Up to ${MAX_SPOTS_PER_INSTRUMENT} spots each, and ${MAX_SPOTS_PER_SESSION} across the whole session.`}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newInstrument}
            onChange={(event) => setNewInstrument(event.target.value)}
            /* Enter would otherwise submit the wizard's form — which on the last
               step publishes, and on this one does nothing visible. */
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              addInstrument();
            }}
            placeholder="Trumpet, Cajón, Harmonica…"
            className="input flex-1"
          />
          <button
            type="button"
            onClick={addInstrument}
            disabled={!newInstrument.trim()}
            className="btn btn-primary font-bold"
          >
            Add
          </button>
        </div>
      </JamField>

      {totalSpots !== null && plan && (
        <div className="rounded-box border border-base-300 p-4 text-sm">
          <p>
            <span className="font-bold tabular-nums">{spotsPerSlot}</span> spots
            per slot × <span className="font-bold tabular-nums">{plan.slots.length}</span>{' '}
            slots ={' '}
            <span
              className={`font-bold tabular-nums ${
                totalSpots > MAX_SPOTS_PER_SESSION ? 'text-error' : ''
              }`}
            >
              {totalSpots}
            </span>{' '}
            bookable spots.
          </p>
        </div>
      )}
    </div>
  );
}
