'use client';

import { useWatch } from 'react-hook-form';

import { GENRE_LABELS, SKILL_LEVEL_LABELS } from '@/config/jamOptions';
import { useJamForm } from '@/hooks/useJamForm';
import { buildSlotPlan } from '@/lib/slotPlan';
import JamField from './JamField';

/* The last look before it goes live.

   A recap of what was typed, not yet the listing a musician will see — that's
   phase 6, and it needs the browse card design to exist first. What this does
   have to do is show the two things the venue never typed and can't otherwise
   check: how many slots came out of the times they chose, and how many bookable
   spots that multiplies into. */
export default function PreviewStep() {
  const { control } = useJamForm();
  const values = useWatch({ control });

  const {
    title,
    summary,
    date,
    startTime,
    endTime,
    venueName,
    address,
    overview,
    slotDurationMinutes = 0,
    instrumentTemplate = [],
    genres = [],
    skillLevel = [],
  } = values;

  const lineUp = instrumentTemplate.filter((row) => (row?.spotsTotal ?? 0) > 0);
  const plan = buildSlotPlan(startTime ?? '', endTime ?? '', slotDurationMinutes);
  const spotsPerSlot = lineUp.reduce((total, row) => total + (row?.spotsTotal ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="rounded-box border border-base-300 p-5">
        <h2 className="font-heading text-xl">{title || 'Untitled session'}</h2>
        <p className="mt-2 text-sm opacity-80">{summary}</p>

        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Row label="When">
            {formatDate(date)}
            {startTime && endTime && (
              <span className="tabular-nums">
                {' · '}
                {startTime} – {endTime}
              </span>
            )}
          </Row>

          <Row label="Where">
            {venueName}
            {address?.formatted && (
              <span className="block opacity-70">{address.formatted}</span>
            )}
          </Row>

          <Row label="Slots">
            {plan
              ? `${plan.slots.length} × ${slotDurationMinutes} minutes`
              : 'Not set yet'}
          </Row>

          <Row label="Bookable spots">
            {plan ? spotsPerSlot * plan.slots.length : 'Not set yet'}
          </Row>
        </dl>
      </div>

      <JamField label="Line-up">
        <ul className="flex flex-wrap gap-2">
          {lineUp.length === 0 && (
            <li className="text-sm opacity-60">No instruments yet</li>
          )}
          {lineUp.map((row, index) => (
            <li
              key={`${row?.instrument}-${index}`}
              className="rounded-field bg-base-200 px-3 py-1 text-sm"
            >
              {row?.instrument}{' '}
              <span className="font-bold tabular-nums">×{row?.spotsTotal}</span>
            </li>
          ))}
        </ul>
      </JamField>

      <JamField label="Genres & levels">
        <ul className="flex flex-wrap gap-2">
          {genres.map((genre) => (
            <li
              key={genre}
              className="rounded-field bg-secondary/15 px-3 py-1 text-sm"
            >
              {genre && GENRE_LABELS[genre]}
            </li>
          ))}
          {skillLevel.map((level) => (
            <li
              key={level}
              className="rounded-field bg-accent/25 px-3 py-1 text-sm"
            >
              {level && SKILL_LEVEL_LABELS[level]}
            </li>
          ))}
        </ul>
      </JamField>

      {overview?.trim() && (
        <JamField label="Overview">
          {/* whitespace-pre-wrap so the line breaks the venue typed survive.
              It's markdown underneath, and phase 5 renders it as such — showing
              it raw is more honest than showing it collapsed into one block. */}
          <p className="whitespace-pre-wrap text-sm opacity-80">{overview}</p>
        </JamField>
      )}
    </div>
  );
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <dt className="text-xs uppercase tracking-wide opacity-60">{label}</dt>
    <dd className="mt-0.5 text-sm">{children}</dd>
  </div>
);

/* The stored value is a plain calendar day, so it's formatted in UTC — reading
   it with local getters would show the day before for anyone west of Greenwich. */
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const formatDate = (date: string | undefined): string => {
  if (!date) return 'No date yet';

  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
};
