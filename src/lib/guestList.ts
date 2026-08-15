import type { Booking } from '@/schemas/booking';

/* Bookings as the venue thinks of them: one row per submission, not per spot.

   The API stores one Booking document per spot, so a trio that claimed three
   spots in one go is three documents sharing a `groupId`. That shape is right
   for the spots themselves — each one is separately cancellable, and each one is
   what `claimSpot` competes over — but it is not how anybody reads a guest list.
   Three rows saying "Marta Nowak" is a list that has to be mentally de-duplicated
   before it can be counted.

   So the grouping happens here rather than in the component, and it is not just
   a `groupBy`: three of the fields below have to be *derived* across the group
   rather than read off any one document. */

export type GuestSpot = {
  bookingId: string;
  instrument: string;
  label: string;
  cancelled: boolean;
};

/* Two states, and the rule is "a booking is cancelled when there is nothing left
   of it".

   A group *can* be half gone — `DELETE /bookings/:id` cancels one spot, so a
   musician who booked three and dropped one leaves a mixed submission. That does
   not earn a third status. The column answers "is this person coming?", and for
   a trio that dropped one spot the answer is still yes; which spot went is in the
   spot list, struck through, and *that something changed* is what `modifiedAt` is
   for. A third value would put the same fact in three places and quietly change
   the question the column answers. */
export type GuestGroupStatus = 'confirmed' | 'cancelled';

export type GuestGroup = {
  groupId: string;
  musician: Booking['musician'];
  bandName?: string;
  slotId: string;
  slotStartTime: string;
  slotEndTime: string;
  spots: GuestSpot[];
  status: GuestGroupStatus;
  /* When the submission was made. The earliest of the group's `createdAt`s —
     `insertMany` writes them together, so in practice they are the same
     millisecond, and taking the earliest is what keeps that from mattering. */
  bookedAt: Date;
  /* The last time anything in the group changed. The *latest* `updatedAt`, which
     is the whole point of the column: a group whose modified date has moved away
     from its booked date is one where somebody cancelled a spot. */
  modifiedAt: Date;
};

export const guestGroups = (bookings: readonly Booking[]): GuestGroup[] => {
  const groups = new Map<string, GuestGroup>();

  for (const booking of bookings) {
    const spot: GuestSpot = {
      bookingId: booking.id,
      instrument: booking.instrument,
      label: booking.label,
      cancelled: booking.status === 'cancelled',
    };

    const group = groups.get(booking.groupId);

    if (!group) {
      /* The fields that are the same on every document in the group — one
         request wrote them all, and `bookingInputSchema` takes a single `slotId`
         and a single `bandName`, so a group cannot span two slots or two names.
         Read off the first one seen rather than checked on each. */
      groups.set(booking.groupId, {
        groupId: booking.groupId,
        musician: booking.musician,
        bandName: booking.bandName,
        slotId: booking.slotId,
        slotStartTime: booking.slotStartTime,
        slotEndTime: booking.slotEndTime,
        spots: [spot],
        /* Provisional — settled below, once every spot is in. */
        status: spot.cancelled ? 'cancelled' : 'confirmed',
        bookedAt: booking.createdAt,
        modifiedAt: booking.updatedAt,
      });

      continue;
    }

    group.spots.push(spot);

    if (booking.createdAt < group.bookedAt) group.bookedAt = booking.createdAt;
    if (booking.updatedAt > group.modifiedAt) group.modifiedAt = booking.updatedAt;
  }

  for (const group of groups.values()) {
    /* `every`, not `some`: one live spot is still somebody turning up. */
    group.status = group.spots.every(({ cancelled }) => cancelled)
      ? 'cancelled'
      : 'confirmed';

    /* By label, so a band's spots read "First Guitar, Second Guitar" in the same
       order every render. The API returns a group's documents in whatever order
       mongo hands them back, which is stable in practice and not promised. */
    group.spots.sort((a, b) => a.label.localeCompare(b.label));
  }

  /* Through the night, and within a slot the people who committed first at the
     top. `slotStartTime` is "HH:mm" and sorts lexicographically in the same order
     it sorts chronologically — the reason lib/time keeps times as strings. */
  return [...groups.values()].sort(
    (a, b) =>
      a.slotStartTime.localeCompare(b.slotStartTime) ||
      Number(a.bookedAt) - Number(b.bookedAt),
  );
};
