/* Wall-clock helpers, mirroring oh-jamming-api/src/utils/time.ts.

   The API interprets every time in one fixed zone — jam sessions happen in
   physical rooms in one city, so "19:00" means 19:00 there no matter where the
   browser is. That matters here rather than only there: the "date cannot be in
   the past" rule is checked against Berlin's calendar day, so a client that
   asked its own clock would pass a form the API then rejects, or block one it
   would have accepted. Both are worse than being slightly redundant. */

export const APP_TIMEZONE = 'Europe/Berlin';

/* The same shape the API accepts: exactly "HH:mm", 00:00 to 23:59. Used to tell
   a half-typed value apart from a real one before doing arithmetic on it. */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isTime = (value: string): boolean => TIME_PATTERN.test(value);

/* "HH:mm" -> minutes since midnight. Every duration in the app is counted this
   way rather than with Date arithmetic, which is what keeps DST out of it: a
   session running 19:00–22:00 is three hours of wall clock on every date. */
export const timeToMinutes = (time: string): number => {
  const [hours = '0', minutes = '0'] = time.split(':');

  return Number(hours) * 60 + Number(minutes);
};

/* The inverse, used to lay out slot boundaries. Never has to render "24:00" —
   the latest time either side accepts is 23:59, and sessions can't cross
   midnight, so a slot cannot end past the end of the day. */
export const minutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/* Built once at module load — constructing an Intl formatter is comparatively
   expensive and this one never varies. */
const appTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  /* Without this, midnight formats as "24:00" in some locales. */
  hourCycle: 'h23',
});

/* Now in APP_TIMEZONE as the two string shapes the API speaks:
   { date: "2026-09-16", time: "19:00" }.

   Strings rather than a Date on purpose — an ISO date and an "HH:mm" time both
   sort correctly as strings, so "is this in the past?" is a plain `<` with
   nothing to convert and nothing to get subtly wrong. */
export const nowInAppTimezone = (): { date: string; time: string } => {
  const parts = Object.fromEntries(
    appTimeFormatter.formatToParts(new Date()).map(({ type, value }) => [type, value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
};

/* A stored jam date back to the "YYYY-MM-DD" the rest of the app compares on —
   the mirror of the API's `utcMidnightToDateString`.

   Read in UTC rather than with local getters, and that is the whole point of
   having it named. The value marks a calendar day pinned to midnight UTC, so
   `getDate()` in a browser west of Greenwich hands back the day before: a
   session on the 19th shows as the 18th, and "is it today?" answers wrong once
   a day, for the users least likely to report it. */
export const utcMidnightToDateString = (date: Date): string =>
  date.toISOString().slice(0, 10);
