'use client';

import { useEffect, useRef } from 'react';
import { IoIosPeople } from 'react-icons/io';
import { RiAlertFill } from 'react-icons/ri';

import type { JamSession } from '@/schemas/jamSession';

/* How much of the line-up this takes down with it.

   Spots, not people. The API writes one Booking document per spot — a band that
   claimed three spots in one submission is three bookings sharing a `groupId`,
   and `cancelJamSession`'s cascade flips all three. Counting people would be the
   better number to show, and it isn't available here: a spot carries a
   `bookingId` and nothing else, so the session alone can't say whether two
   bookings belong to one musician. Saying "spots" is the claim this data
   actually supports. */
const countBookedSpots = (session: JamSession): number =>
  session.slots
    .flatMap((slot) => slot.spots)
    .filter((spot) => spot.bookingId !== null).length;

type Props = {
  /* Null means closed. One value rather than a `session` plus an `open` flag —
     two would let the dialog be open with nothing to name. */
  session: JamSession | null;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export default function CancelJamDialog({
  session,
  pending,
  error,
  onConfirm,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  /* `showModal()` rather than the `open` attribute, and that is the whole reason
     this is a <dialog> at all: it puts the element in the browser's top layer —
     above the fixed site header without a z-index war — traps focus inside,
     makes the rest of the page inert, and wires up Escape. Every one of those is
     something a div would have to reimplement, badly. */
  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (session && !dialog.open) dialog.showModal();
    if (!session && dialog.open) dialog.close();
  }, [session]);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      /* Escape and backdrop dismissal both end here, so the parent's state can't
         be left thinking the dialog is still open after the browser closed it. */
      onClose={onClose}
      /* Escape fires `cancel` before `close`. Refusing it mid-request keeps the
         dialog on screen until the API has answered — closing early would leave
         the venue looking at a board that hasn't caught up with what they just
         did, with no way to tell whether it worked. */
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <div className="modal-box max-w-md text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-caution/10">
          {/* Decorative — the heading below says the same thing in words. */}
          <RiAlertFill aria-hidden className="size-8 text-caution" />
        </div>

        {/* The content font, not `font-heading`. Changa One is a display face
            built for three or four words; set at two lines of a question it is
            harder to read than the sentence deserves, and this is the one piece
            of text on the screen that has to be understood before a click. */}
        <h3 className="mt-5 text-2xl font-bold">
          Are you sure you want to cancel this jam session?
        </h3>

        {/* The title names the session so the venue can see they're about to
            call off the one they meant — the board can have several nights on it
            with the same shape. */}
        {session && (
          <p className="mt-3 font-bold text-primary">
            &ldquo;{session.title}&rdquo;
          </p>
        )}

        {/* One panel now, holding both the warning and its consequence. They
            were two separate lines and the consequence read as a footnote — the
            number of people this reaches is the whole reason to stop and think,
            so it belongs inside the thing that says stop. */}
        <div className="mt-5 flex items-start gap-3 rounded-box border border-caution/40 bg-caution/8 p-4 text-left">
          <IoIosPeople aria-hidden className="size-6 shrink-0 text-caution" />

          <div>
            <p className="font-bold text-caution">This can&apos;t be undone.</p>

            {/* Only when there are any. A flat "0 booked spots will be cancelled"
                on a night nobody booked is noise, and noise is what teaches
                people to click through warnings without reading them. */}
            {session && countBookedSpots(session) > 0 && (
              <p className="mt-1 text-sm text-base-content/80">
                <span className="font-bold tabular-nums">
                  {countBookedSpots(session)}
                </span>{' '}
                booked {countBookedSpots(session) === 1 ? 'spot' : 'spots'} will
                be cancelled too.
              </p>
            )}
          </div>
        </div>

        {/* Rendered here rather than closing on failure: a dialog that vanishes
            leaves the venue guessing whether the night is off. */}
        {error && (
          <p role="alert" className="mt-4 text-sm text-error">
            {error}
          </p>
        )}

        {/* justify-center overrides modal-action's right alignment — the
            SweetAlert shape the design is after is a centred pair. */}
        <div className="modal-action justify-center">
          {/* The board's pink rather than daisyUI's `btn-error` red, so the
              button that finishes the job is the same colour as the one that
              started it — the venue clicked a pink Cancel to get here. */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="btn border-0 bg-status-cancelled font-bold text-white hover:bg-status-cancelled/90"
          >
            {pending && <span className="loading loading-spinner loading-sm" />}
            Cancel session
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            /* Focus lands on the way out, not on the way through. <dialog>
               focuses its first focusable child, and with the destructive button
               first that would put Enter one keystroke from calling off a jam
               the venue only came here to look at. */
            autoFocus
            /* Outline rather than ghost: a ghost button is only a label until
               you hover it, and the safe way out of a destructive dialog should
               look like a button without being hunted for. */
            className="btn btn-outline btn-primary font-bold"
          >
            Back
          </button>
        </div>
      </div>

      {/* daisyUI's click-outside-to-close: a form whose only button submits the
          dialog. Dismissing is the safe direction here, so it stays available —
          but not mid-request, for the same reason Escape doesn't. */}
      {!pending && (
        <form method="dialog" className="modal-backdrop">
          <button type="submit">Back</button>
        </form>
      )}
    </dialog>
  );
}
