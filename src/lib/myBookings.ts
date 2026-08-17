import { nowInAppTimezone, utcMidnightToDateString } from '@/lib/time';
import type { Booking } from '@/schemas/booking';

/* `GET /bookings` returns spots; `/my-bookings` draws bookings. This is where
   the one becomes the other.

   One submission writes a Booking document per claimed spot, all sharing a
   `groupId` — so a trio that booked two guitars and a voice is three rows and
   one card. Every field a card shows except the instruments is identical across
   the group, which is what makes the first row safe to read them from.

   See `docs/my-bookings.md` for why the page is shaped this way at all. */

export type BookingCardStatus = 'confirmed' | 'past' | 'cancelled';

export type BookingCardView = {
  groupId: string;
  jamSessionId: string;
  title: string;
  venueName: string;

  /* "YYYY-MM-DD", not a Date. Everything the page does with the date is a
     comparison against today or a split into three strings, and both are exact
     on a string where a Date would drag a timezone into it. */
  date: string;
  dateParts: { month: string; day: string; year: string };
  startTime: string;
  endTime: string;

  spots: string[];
  bandName?: string;

  /* The address as the card draws it: street on one line, postcode and town on
     the next, country dropped. Empty when the API hasn't been redeployed with
     `address` in the bookings projection — the card leaves the field out rather
     than printing a blank label. */
  addressLines: string[];

  status: BookingCardStatus;

  /* Kept alongside `status` rather than derived from it, because a cancelled
     booking for a night that has already happened is *both* and the badge can
     only say one of them. The badge reads `status`; sorting and (later) the
     action buttons read this. */
  isPast: boolean;
};

/* The month on the date stub. Built by index off the "YYYY-MM-DD" string rather
   than through Intl: the value is a calendar day with no time and no place, and
   every formatter that takes a Date will happily shift it across a midnight for
   somebody in the wrong timezone. Twelve strings can't. */
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const splitDate = (date: string): BookingCardView['dateParts'] => {
  const [year = '', month = '', day = ''] = date.split('-');

  return {
    month: (MONTHS[Number(month) - 1] ?? '').toUpperCase(),
    day,
    year,
  };
};

/* A part that starts with a postcode: "70173 Stuttgart". The same anchor
   `cityFromAddress` uses, and for the same reason — the geocoder puts the town
   immediately after a four- or five-digit postcode, in its own comma-separated
   part, with a country part that may or may not follow. Counting parts from
   either end picks "Germany" off half of them. */
const POSTCODE_PART = /^\d{4,5}\s+\S/;

/* "Königstraße 20, 70173 Stuttgart, Germany" -> ["Königstraße 20", "70173 Stuttgart"]
 *
 * Two lines, the way an envelope is addressed: everything before the postcode is
 * the street, the postcode part is the town, and whatever follows is the country
 * — which nobody needs on a ticket for a room they are travelling to tonight.
 *
 * The address is one free-text line in the model, not structured fields, so this
 * is a split rather than a lookup. When the postcode anchor doesn't match — a
 * venue that typed the address by hand, which the API allows — the first two
 * parts are the honest guess, and one long line is better than a wrong split. */
export const splitAddress = (formatted: string): string[] => {
  const parts = formatted
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const postcodeAt = parts.findIndex((part) => POSTCODE_PART.test(part));
  const postcodeLine = postcodeAt === -1 ? undefined : parts[postcodeAt];

  /* `> 0`, not `!== -1`: an address that *starts* with its postcode has no
     street part to put above it, and joining an empty slice would print a
     leading comma. */
  if (postcodeAt > 0 && postcodeLine) {
    return [parts.slice(0, postcodeAt).join(', '), postcodeLine];
  }

  return parts.slice(0, 2);
};

const toCard = (rows: Booking[], today: string): BookingCardView | null => {
  const [first] = rows;

  if (!first) return null;

  const date = utcMidnightToDateString(first.jamSession.date);
  const isPast = date < today;

  return {
    groupId: first.groupId,
    jamSessionId: first.jamSession.id,
    title: first.jamSession.title,
    venueName: first.jamSession.venueName,

    date,
    dateParts: splitDate(date),
    startTime: first.slotStartTime,
    endTime: first.slotEndTime,

    /* Left in the order the API returned them, which is the order the spots were
       claimed. Sorting on the label would read alphabetically — "First guitar"
       before "Second guitar" by luck, and "Voice" last by accident. */
    spots: rows.map(({ label }) => label),
    bandName: first.bandName,

    addressLines: first.jamSession.address
      ? splitAddress(first.jamSession.address.formatted)
      : [],

    /* A venue cancelling a night cascades to its bookings (BK14), so a session
       the venue called off is already `cancelled` on every row here — there is
       no separate case for it, and adding one would put two different words on
       the same fact. */
    status: first.status === 'cancelled' ? 'cancelled' : isPast ? 'past' : 'confirmed',
    isPast,
  };
};

/* Cyan on the first card and every third one after it — 1, 4, 7 — with royal
   blue on the two in between.

   Colour is a property of the *position*, not of the booking. It was the status
   at first, and that read as meaning: two cancelled bookings in a row became one
   long blue block, and a musician with nothing but past nights got a page with
   no cyan on it at all. As a rhythm it does the job colour is actually good at
   here — separating one ticket from the next — and leaves saying what a booking
   *is* to the badge, which says it in words.

   Here rather than in the card that draws it, because the details page has to
   answer the same question: a ticket that was royal blue in the list and cyan
   when you tapped it reads as a different booking. Both callers ask this, so
   neither owns it. */
export const isCyanCard = (index: number): boolean => index % 3 === 0;

/* One group, for `/my-bookings/[group]`.

   Deliberately not routed through `toBookingCards`: that applies the
   cancelled-shadow filter, which exists to keep a superseded booking off a
   *list*. Asked for one booking by its id, hiding it is the wrong answer — the
   link may be in someone's history, and "this doesn't exist" about something
   that does is worse than showing a cancelled night. */
export const toBookingCard = (rows: Booking[]): BookingCardView | null =>
  toCard(rows, nowInAppTimezone().date);

/* "JSB-4F2A0C" — the group's own id, shortened to something a person can read
   out over a phone.

   A rendering of `groupId`, not a second identifier: nothing is stored, and
   nothing is ever looked up by it. The full uuid is what the URL and every
   request carry, and the QR carries `qrCode`, which is a different token again.
   Six hex characters can collide in principle; they cannot collide *for one
   musician*, which is the only place this is ever read. */
export const bookingReference = (groupId: string): string =>
  `JSB-${groupId.replace(/-/g, '').slice(-6).toUpperCase()}`;

export const toBookingCards = (bookings: Booking[]): BookingCardView[] => {
  /* The app's timezone, not the browser's. A musician in another country
     shouldn't see tonight's session filed under yesterday because their clock
     rolled over first — the night happens in a room in one city. */
  const { date: today } = nowInAppTimezone();

  const groups = new Map<string, Booking[]>();

  for (const booking of bookings) {
    const rows = groups.get(booking.groupId);

    if (rows) rows.push(booking);
    else groups.set(booking.groupId, [booking]);
  }

  const cards = [...groups.values()]
    .map((rows) => toCard(rows, today))
    .filter((card): card is BookingCardView => card !== null);

  /* Hide a cancelled booking for a night the musician is still playing.
     Written as a rule about bookings rather than about edits: if you have a live
     booking for a session, the spots you dropped for it are not news — they are
     the shape of a decision you already finished making.

     It also happens to hide the tombstone that "Change booking" leaves behind,
     which is why it is built now. Both jobs are honest; only the second one is
     temporary. See `docs/my-bookings.md`.

     A booking cancelled outright still shows. That is the record of what was
     dropped, and this page is the only place it exists. */
  const stillPlaying = new Set(
    cards.filter(({ status }) => status !== 'cancelled').map(({ jamSessionId }) => jamSessionId),
  );

  return cards
    .filter(({ status, jamSessionId }) => status !== 'cancelled' || !stillPlaying.has(jamSessionId))
    .sort((a, b) => {
      /* Everything still to come, soonest first, then everything behind —
         most recent first. The next night a musician is playing is the reason
         they opened this page; last spring's is not. */
      if (a.isPast !== b.isPast) return a.isPast ? 1 : -1;

      const order = `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`);

      return a.isPast ? -order : order;
    });
};
