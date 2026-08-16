import { z } from 'zod';

/* What `GET /bookings` returns, mirroring the API's `bookingDetailOutputSchema`.

   There is no payload schema here and no form: this side of the app only ever
   reads bookings. A venue cannot make one, and cannot remove a musician from a
   night it is still running (BK12) — the only way a spot goes back on the board
   is the musician cancelling it themselves.

   `z.object` rather than `z.strictObject`, the same call as `jamSessionSchema`:
   strict on the way out would mean the day the API adds a field, every response
   fails to parse and the client breaks on a change that should be harmless. */

export const bookingStatuses = ['confirmed', 'cancelled'] as const;

/* BK08 — the API's cap on one submission, mirrored here so the instrument picker
   can stop at it rather than send an eleventh spot and take a 400 for the whole
   booking. It is the API's number: raising it here alone only moves where the
   rejection happens. */
export const MAX_SPOTS_PER_BOOKING = 10;

/* The API populates both references and renames them on the way out —
   `.populate()` writes the document back to the path it read, so mongoose hands
   over a session sitting under the key `jamSessionId`, and the output schema's
   transform is what turns that into `jamSession`. Worth knowing here because it
   means these are projections, not the full documents: five fields on the
   session, three on the musician, and no way to ask this endpoint for more. */
const jamSessionSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.coerce.date(),
  venueName: z.string(),
  status: z.string(),

  /* Optional, and that is about deployment rather than about the data: the API
     added `address` to this projection after the client shipped, and a required
     field here would fail every parse — the whole page, not one line — against
     an API that hasn't been redeployed yet. It is required on the API's own
     schema, so absent means "old server", never "session without an address". */
  address: z.object({ formatted: z.string() }).optional(),
});

/* BK18 — a name and an email, and nothing else. The API projects exactly these
   three fields at the query, so what is absent here is absent from the response
   too: there is no field for a careless render to leak.

   The email is what a venue needs to reach the people playing at its night, and
   the booking is what earns it. There is still no way to turn a name into an
   account — `GET /users/:id` is self-only and there is no users index — so this
   never reaches a musician the caller has no booking with. */
const musicianSummarySchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
});

export const bookingSchema = z.object({
  id: z.string(),

  /* Shared by every booking made in one submission. A band taking four spots is
     four documents with one `groupId` — the API writes one Booking per spot, not
     one per submission — so counting rows counts spots, and counting distinct
     groupIds counts bookings. Both numbers are wanted, in different places. */
  groupId: z.string(),

  slotId: z.string(),
  spotId: z.string(),

  /* Copied off the spot when it was claimed rather than looked up on every read,
     and safe by construction: JS10 freezes the session's times and line-up the
     moment any spot on it is booked, so these can't drift from the session while
     the booking is live. It's what lets a guest list render without walking
     `slots[]` for every row. */
  instrument: z.string(),
  label: z.string(),
  slotStartTime: z.string(),
  slotEndTime: z.string(),

  bandName: z.string().optional(),

  status: z.enum(bookingStatuses),

  /* An opaque token, not an image — the client draws the QR from it. Unused so
     far; it belongs to check-in, which is a different feature and a different
     night. Declared because it is on the wire, so `z.object` doesn't silently
     strip something the next feature will want. */
  qrCode: z.string(),

  jamSession: jamSessionSummarySchema,
  musician: musicianSummarySchema,

  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Booking = z.infer<typeof bookingSchema>;

/* What `POST /bookings` takes, mirroring the API's `bookingInputSchema`.

   `strictObject`, like every payload here: the API's is strict, so one unknown
   key is a 400 for the whole submission rather than a field it ignores. The
   server-owned ones are the trap — `musicianId` comes from the access token,
   `groupId` and `qrCode` are generated per submission, `status` only moves
   through the cancel endpoint — so none of them may be sent, however tempting it
   is to echo back what the summary already knows.

   One slot, several spots: that is the shape of the booking flow, and it is why
   `slotId` is a single value while `spotIds` is a list. Two slots is two
   submissions, two groups, two QR codes. */
export const bookingPayloadSchema = z.strictObject({
  jamSessionId: z.string(),
  slotId: z.string(),
  spotIds: z.array(z.string()).min(1).max(MAX_SPOTS_PER_BOOKING),
  bandName: z.string().trim().min(2).max(120).optional(),
});

export type BookingPayload = z.infer<typeof bookingPayloadSchema>;

/* What comes back from it, mirroring `bookingOutputSchema` — the same booking as
   above with neither reference populated, because nothing has been looked up on
   a document that was written a millisecond ago.

   One object per spot, sharing a `groupId`. That is the confirmation's unit: the
   musician made one booking, and the API wrote four rows for it. */
export const createdBookingSchema = z.object({
  id: z.string(),
  groupId: z.string(),

  jamSessionId: z.string(),
  slotId: z.string(),
  spotId: z.string(),
  musicianId: z.string(),

  instrument: z.string(),
  label: z.string(),
  slotStartTime: z.string(),
  slotEndTime: z.string(),

  bandName: z.string().optional(),

  status: z.enum(bookingStatuses),
  qrCode: z.string(),

  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CreatedBooking = z.infer<typeof createdBookingSchema>;
