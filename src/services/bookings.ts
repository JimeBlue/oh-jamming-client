import { z } from 'zod';

import {
  bookingSchema,
  createdBookingSchema,
  type Booking,
  type BookingPayload,
  type CreatedBooking,
} from '@/schemas/booking';
import { api } from '@/services/api';

/* One night's bookings, for the venue running it.

   `GET /bookings` answers two questions from one route — "what am I playing?"
   for a musician, "who is playing at my nights?" for a venue — and reads the
   role off the session cookie to decide which. Nothing here has to say which one
   it is asking; the same call from a musician's browser would return their own
   bookings, which is exactly why there is no role in the signature.

   The `jamSessionId` filter narrows that to one session. It does not widen it:
   the API applies the role scope on top, so pointing this at another venue's
   session id — public information, since the browse is — returns an empty list
   rather than their roster.

   Cancelled bookings come back too, and that is the point. They are the record
   of who dropped out, and hiding them here would make a cancellation look like
   it never happened. `status` is on every row for the caller to split on. */
export const getJamSessionBookings = (jamSessionId: string): Promise<Booking[]> =>
  api.get(
    `/bookings?jamSessionId=${encodeURIComponent(jamSessionId)}`,
    z.array(bookingSchema),
  );

/* Every booking the signed-in musician has, for `/my-bookings`.

   The same route as above with no filter. There is no `musicianId` to pass and
   no way to pass one: the controller reads the id off the access token and
   builds the filter from it, which is what makes "someone else's bookings" not
   a request that can be written rather than one that is refused.

   Both statuses come back, and every row is one spot — the caller regroups by
   `groupId`. `jamSession` is populated, but only with `title`, `date`,
   `venueName` and `status`, so a card can be drawn without a second request and
   anything outside those four fields is not available here at any price. */
export const getMyBookings = (): Promise<Booking[]> =>
  api.get('/bookings', z.array(bookingSchema));

/* Claims the chosen spots. Musician-only, and the whole submission is one
   transaction on the API's side: if any single spot was taken while the musician
   was reading the summary, none of them are claimed (BK07) and the response is a
   409. That is the failure worth branching on — it is not "try again", it is "go
   back and pick a different instrument", and the caller has to say so.

   Returns one booking per spot, all sharing a `groupId`. */
export const createBooking = (payload: BookingPayload): Promise<CreatedBooking[]> =>
  api.post('/bookings', payload, z.array(createdBookingSchema));

/* Drops a whole booking — every spot claimed in one submission — and puts the
   spots back on the board.

   The group, not the row. `DELETE /bookings/:id` exists and cancels one spot,
   but a booking is what the musician made and the group is what they see, so
   that endpoint has nowhere to be clicked (see `docs/my-bookings.md`).

   A soft delete on the API's side (BK11): the rows survive as `cancelled`, which
   is why `toBookingCards` has a filter for the ones that shouldn't be listed.
   Idempotent too — `cancelOne` returns early on an already-cancelled row — so a
   double-click is not a 409 and this needs no guard beyond a spinner.

   Musician-only and own-bookings-only (BK12): a venue cannot pull one player off
   a night it is still running. */
export const cancelBookingGroup = (groupId: string): Promise<void> =>
  api.del(`/bookings/group/${encodeURIComponent(groupId)}`);
