import type { Booking } from '@/schemas/booking';
import type { JamSession } from '@/schemas/jamSession';

/* The cockpit's arithmetic, kept out of the components that draw it.

   ONE RULE GOVERNS THIS WHOLE FILE, and getting it wrong is the difference
   between a report and a rumour: **occupancy is counted from the session, never
   from the bookings.**

   `spots[].bookingId` is the entire availability model — there is no counter
   anywhere to fall out of step with it. Counting the bookings list instead would
   overcount, because a musician cancelling a booking *releases* the spot
   (`cancelOne` calls `releaseSpot`): the cancelled row is still in the list, but
   the spot it names is free again, or already taken by somebody else.

   So the two halves below read different sources on purpose. `jamReport` walks
   the session and answers "how full is this night?". `guestTally` walks the
   bookings and answers "how many people, and how many dropped out?" — questions
   the spots cannot answer, since a spot knows it is taken but not by whom, and a
   released spot has forgotten it was ever booked.

   The exception is a cancelled session, and it inverts the rule completely:
   `cancelJamSession` marks every booking cancelled but deliberately leaves the
   spots holding their `bookingId`s, so a cancelled night reports as sold out.
   Nothing here tries to detect that — see `JamCancelledNotice`, which is what a
   cancelled session shows instead of any of this. */

export type InstrumentTally = {
  instrument: string;
  booked: number;
  total: number;
};

export type SlotTally = {
  slotId: string;
  startTime: string;
  endTime: string;
  booked: number;
  total: number;
  byInstrument: InstrumentTally[];
};

export type JamReport = {
  booked: number;
  total: number;
  free: number;
  /* 0–100, rounded. A percentage rather than a fraction because every consumer
     wants it as one — the bar width, the donut, the label. */
  fillRate: number;
  /* Totalled across the whole night: what the venue staffs for. */
  byInstrument: InstrumentTally[];
  /* Per slot, in the order the session stores them, which is already
     chronological. */
  bySlot: SlotTally[];
};

type Spot = JamSession['slots'][number]['spots'][number];

/* Booked and offered per instrument, in first-appearance order.

   Derived from the spots rather than from `instrumentTemplate`, even though the
   template is right there and would be one line. The template describes what the
   venue asked for; the spots are what was generated from it, and they are what a
   musician actually booked. Reading the spots means the report cannot disagree
   with the document it is reporting on — and a Map keeps insertion order, which
   is the template's order anyway, since that is the order `generateSlots` walks. */
const tallySpots = (spots: readonly Spot[]): InstrumentTally[] => {
  const rows = new Map<string, InstrumentTally>();

  for (const { instrument, bookingId } of spots) {
    const row = rows.get(instrument) ?? { instrument, booked: 0, total: 0 };

    row.total += 1;
    if (bookingId !== null) row.booked += 1;

    rows.set(instrument, row);
  }

  return [...rows.values()];
};

const countBooked = (spots: readonly Spot[]): number =>
  spots.filter(({ bookingId }) => bookingId !== null).length;

export const jamReport = (session: JamSession): JamReport => {
  const bySlot: SlotTally[] = session.slots.map(
    ({ slotId, startTime, endTime, spots }) => ({
      slotId,
      startTime,
      endTime,
      booked: countBooked(spots),
      total: spots.length,
      byInstrument: tallySpots(spots),
    }),
  );

  const allSpots = session.slots.flatMap(({ spots }) => spots);
  const total = allSpots.length;
  const booked = countBooked(allSpots);

  return {
    booked,
    total,
    free: total - booked,
    /* A session with no slots cannot happen — the API refuses a window that
       doesn't divide — but 0/0 is NaN, and a NaN reaching a `width:` style is a
       bar that renders at some arbitrary length rather than not at all. */
    fillRate: total === 0 ? 0 : Math.round((booked / total) * 100),
    byInstrument: tallySpots(allSpots),
    bySlot,
  };
};

export type GuestTally = {
  /* Submissions, not spots. A band taking four spots is one booking. */
  bookings: number;
  /* Distinct accounts. Always at most `bookings`, and usually fewer, because
     somebody who plays two slots booked twice. */
  musicians: number;
  /* Cancelled bookings, which is cancelled *spots* — one Booking per spot. Kept
     out of every other number here: those spots went back on the board and may
     already be somebody else's. */
  droppedOut: number;
};

export const guestTally = (bookings: readonly Booking[]): GuestTally => {
  const live = bookings.filter(({ status }) => status === 'confirmed');

  return {
    bookings: new Set(live.map(({ groupId }) => groupId)).size,
    musicians: new Set(live.map(({ musician }) => musician.id)).size,
    droppedOut: bookings.length - live.length,
  };
};

/* The guest list's order: through the night, and within a slot the people who
   committed first at the top.

   `slotStartTime` is "HH:mm" and sorts lexicographically in the same order it
   sorts chronologically — the reason lib/time keeps times as strings at all.
   `createdAt` breaks the tie so a band's spots stay together and in the order
   they were claimed, rather than shuffling on every render. `label` is the last
   resort, since `insertMany` can write a group's documents in the same
   millisecond. */
export const inGuestOrder = (bookings: readonly Booking[]): Booking[] =>
  [...bookings].sort(
    (a, b) =>
      a.slotStartTime.localeCompare(b.slotStartTime) ||
      Number(a.createdAt) - Number(b.createdAt) ||
      a.label.localeCompare(b.label),
  );
