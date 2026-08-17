import { ApiError } from '@/services/api';
import { cancelBookingGroup, createBooking } from '@/services/bookings';

/* Changing a booking, on an API that has no endpoint for it.
   Read `docs/my-bookings.md` before changing anything here.

   **This is a simulation.** There is no `PATCH /bookings/group/:groupId`, so
   "Save changes" cancels the whole booking and creates a new one. The user is
   told the truth about the outcome — their booking changed — and nothing about
   the mechanism, because the mechanism is a stand-in.

   Cancel first, then create, which is the order that can lose the spots. The
   safe-looking order does not work at all: a confirmed booking holds its spot
   under a partial unique index, so keeping Guitar at 20:00 and adding Bass would
   have the create step claim a spot *this musician's own live booking is still
   holding* — a 409 against yourself, on the most ordinary edit there is. It
   would only work when the new selection shares no spot with the old one, which
   is too subtle a condition to build a flow on. So: one order, one code path,
   and a rollback for the window it opens.

   Written here rather than in the dialog so that when the real endpoint lands
   this file becomes one `api.patch` and the dialog keeps its shape entirely. */

export type RescheduleSelection = {
  slotId: string;
  spotIds: string[];
  /* Not editable — there is no PATCH, so it cannot be (decision 8). Carried
     through unchanged so the re-created booking keeps the name the venue's guest
     list already has. */
  bandName?: string;
};

export type RescheduleResult =
  /* The new booking exists. `groupId` is new, and so is the QR code — every
     create mints both. Nothing tells the musician that, and nothing should while
     this is a simulation: to them one booking was changed. It is also why
     nothing in this app may offer to save or export a QR. */
  | { outcome: 'changed'; groupId: string }
  /* The new selection failed and the original was put back. Their booking is
     what it was — under a new id, which only this file knows. */
  | { outcome: 'restored'; groupId: string; message: string }
  /* Both creates failed: the spots went to someone else between the cancel and
     the retry. The booking is gone and no wording makes that not so. Needs two
     people racing the same spot inside the same second. */
  | { outcome: 'lost'; message: string }
  /* The cancel itself failed, so nothing was released and the booking is
     untouched. The only outcome here that costs the musician nothing. */
  | { outcome: 'untouched'; message: string };

const asMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

/* `bandName` is spread in rather than sent as '': the payload mirrors the API's
   `strictObject`, and an empty string fails its `min(2)` — a 400 for the whole
   submission over a field the musician left blank. */
const claim = async (jamSessionId: string, selection: RescheduleSelection) => {
  const [booking] = await createBooking({
    jamSessionId,
    slotId: selection.slotId,
    spotIds: selection.spotIds,
    ...(selection.bandName ? { bandName: selection.bandName } : {}),
  });

  /* The API writes one row per spot and `spotIds` is never empty, so an empty
     array here is a broken server rather than a booking with no spots. Thrown
     rather than returned so it takes the same path as a 409 — including the
     rollback, which is the right response either way. */
  if (!booking) throw new ApiError('The server sent an unexpected response', 500);

  return booking.groupId;
};

export const rescheduleBooking = async ({
  jamSessionId,
  groupId,
  current,
  next,
}: {
  jamSessionId: string;
  groupId: string;
  /* What they hold now — the argument to the rollback, so it has to be read off
     the booking rather than rebuilt from the dialog's controls. */
  current: RescheduleSelection;
  next: RescheduleSelection;
}): Promise<RescheduleResult> => {
  try {
    await cancelBookingGroup(groupId);
  } catch (error) {
    return { outcome: 'untouched', message: asMessage(error) };
  }

  try {
    return { outcome: 'changed', groupId: await claim(jamSessionId, next) };
  } catch (error) {
    /* Every failure rolls back, not only a 409. Whatever went wrong, the spots
       have been released and the musician is holding nothing — which is the one
       state this flow must not leave them in. */
    const message = asMessage(error);

    try {
      return {
        outcome: 'restored',
        groupId: await claim(jamSessionId, current),
        message,
      };
    } catch {
      /* The second failure's message is discarded on purpose: it describes the
         retry, and what the musician needs to hear is what happened to the
         booking. The caller says that part. */
      return { outcome: 'lost', message };
    }
  }
};

/* Whether Save has anything to do. Order-insensitive on the spots, because the
   picker holds a Set and "clicked Bass before Guitar" is not a change.

   Its real job is stopping a no-op edit, which on this flow is not merely
   pointless: it would cancel a live booking and re-create it, taking the window
   and the new QR code for a selection identical to the one they already had. */
export const isSameSelection = (a: RescheduleSelection, b: RescheduleSelection): boolean =>
  a.slotId === b.slotId &&
  a.spotIds.length === b.spotIds.length &&
  a.spotIds.every((spotId) => b.spotIds.includes(spotId));
