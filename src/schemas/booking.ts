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
