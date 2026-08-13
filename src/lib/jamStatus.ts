import { nowInAppTimezone, utcMidnightToDateString } from '@/lib/time';
import type { JamSession } from '@/schemas/jamSession';

/* What the backstage board shows in its Status column — which is not what the
   API stores.

   The model keeps two statuses, `active` and `cancelled`, and nothing else. The
   rest is the calendar: whether a jam is still ahead is a question about when it
   is being read, not about anything written down, so storing it would mean a
   field that silently goes wrong every midnight. Derived here instead, which
   keeps the two questions apart — the API answers "did the venue call this
   off?", this answers "has it happened yet?". */
export type JamStatus = 'upcoming' | 'today' | 'past' | 'cancelled';

/* Day granularity for `today`, deliberately: it covers the whole calendar day
   rather than only the hours between startTime and endTime. Nothing on this page
   re-renders on a clock, so a badge meaning "on right now" would go stale the
   minute the jam ended and stay stale until someone reloaded — a worse lie than
   a badge that never claimed more than "today". */
export const jamStatus = ({
  date,
  status,
}: Pick<JamSession, 'date' | 'status'>): JamStatus => {
  /* Cancelled outranks the calendar. A jam called off last month is cancelled,
     not past — "past" reads as though it ran. */
  if (status === 'cancelled') return 'cancelled';

  /* Both sides are "YYYY-MM-DD" in the venue's city, so this is a string compare
     with no timezone arithmetic anywhere in it (see lib/time). The browser's own
     calendar is never consulted: a venue checking its board from another country
     has to see the same day the room does. */
  const day = utcMidnightToDateString(date);
  const { date: today } = nowInAppTimezone();

  if (day > today) return 'upcoming';
  if (day < today) return 'past';

  return 'today';
};

/* `DELETE /jam-sessions/:id` cancels rather than deletes (JS11) and cascades to
   every confirmed booking on the session. That cascade is a message to
   musicians — the night is off — so it only means anything while the night is
   still ahead. Running it on a jam that already happened would mark real,
   attended bookings as cancelled in order to tidy up a list.

   Today counts as ahead. Calling off the same evening, when the band drops out
   or the room floods, is the case the endpoint exists for. */
export const canCancelJam = (
  session: Pick<JamSession, 'date' | 'status'>,
): boolean => {
  const status = jamStatus(session);

  return status === 'upcoming' || status === 'today';
};
