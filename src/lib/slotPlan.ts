import { isTime, minutesToTime, timeToMinutes } from '@/lib/time';
import { MAX_SLOTS_PER_SESSION } from '@/schemas/jamSession';

/* What a start time, an end time and a slot length add up to.

   The API generates the real slots server-side and sends them back, and it
   stays the only place that does — a second implementation of slot generation
   is a second answer waiting to disagree with the first. This is not that: it's
   the same arithmetic run forward so the venue can *see* what they're about to
   create before they commit to it, and so the slots step can grey out the
   lengths that don't fit.

   The schema enforces all of this independently. Nothing here is a guard. */

export type Slot = {
  startTime: string;
  endTime: string;
};

export type SlotPlan = {
  windowMinutes: number;
  slots: Slot[];
};

/* Null whenever there is nothing meaningful to show: times still being typed,
   an end before a start, a length that leaves a remainder, or so many slots that
   the API would refuse them anyway. Every one of those is either a field error
   already on screen or a disabled option — the caller's job here is only to
   decide whether to draw a preview. */
export const buildSlotPlan = (
  startTime: string,
  endTime: string,
  durationMinutes: number,
): SlotPlan | null => {
  if (!isTime(startTime) || !isTime(endTime) || durationMinutes <= 0) return null;

  const start = timeToMinutes(startTime);
  const windowMinutes = timeToMinutes(endTime) - start;

  if (windowMinutes <= 0) return null;
  if (windowMinutes % durationMinutes !== 0) return null;

  const count = windowMinutes / durationMinutes;

  if (count > MAX_SLOTS_PER_SESSION) return null;

  return {
    windowMinutes,
    slots: Array.from({ length: count }, (_, index) => ({
      startTime: minutesToTime(start + index * durationMinutes),
      endTime: minutesToTime(start + (index + 1) * durationMinutes),
    })),
  };
};

/* "3 hours", "90 minutes", "2 hours 30 minutes" — used in the running summaries
   on the slots step, where "180 minutes" is technically the same answer and much
   harder to picture. */
export const formatMinutes = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const parts = [];

  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);

  return parts.join(' ') || '0 minutes';
};
