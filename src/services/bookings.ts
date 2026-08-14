import { z } from 'zod';

import { bookingSchema, type Booking } from '@/schemas/booking';
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
