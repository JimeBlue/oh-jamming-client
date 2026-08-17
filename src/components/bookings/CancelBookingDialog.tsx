'use client';

import { useEffect, useRef, useState } from 'react';
import { FaExclamation } from 'react-icons/fa6';

import { ApiError } from '@/services/api';
import { cancelBookingGroup } from '@/services/bookings';

/* Are you sure — the last thing between a musician and giving up their spots.

   The one destructive action in the app, and the only one that needs a second
   press. `DELETE /bookings/group/:groupId` takes the whole booking (decision 2):
   a band's four spots are one thing to the person who made it, and there is
   nowhere in this app to remove one of them.

   Reversible in the database and not reversible for the musician, which is the
   distinction the wording has to get right. The rows survive as `cancelled` —
   BK11, a soft delete — but the spots go straight back on the board, and nothing
   in this app or the API puts them back in this musician's hands. Whoever books
   the Bass at 20:00 in the next minute has it. So: "can't be undone", which is
   true of the only part they care about.

   Nothing here is undone by the API's idempotence either. `cancelOne` returns
   early on an already-cancelled row, so a double-press is not a 409 — which is
   why the button needs no guard beyond the spinner it has. */

type CancelBookingDialogProps = {
  groupId: string;
  onClose: () => void;
  /* Called once the spots are gone. The details page has no way to say
     "cancelled" — it draws a ticket, not a status — so this sends the musician
     back to the list, where the card wears the badge that says it. */
  onCancelled: () => void;
};

export default function CancelBookingDialog({
  groupId,
  onClose,
  onCancelled,
}: CancelBookingDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* `showModal()` is the only thing that gives a `<dialog>` the top layer, the
     focus trap, the backdrop and the inert page behind it. */
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const confirm = async () => {
    setCancelling(true);
    setError(null);

    try {
      await cancelBookingGroup(groupId);
      onCancelled();
    } catch (caught) {
      /* The API's wording, verbatim. The two failures that reach here — a group
         that isn't there, and a group that isn't yours — are both about which
         booking this is, and it is the side that knows. */
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Something went wrong. Please try again.',
      );
      setCancelling(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      /* Escape closes a modal dialog without asking React, so the page would go
         on thinking this was open and the button that opens it would stop
         responding. Not while the request is out — closing then would leave a
         cancel running with nothing to report to. */
      onClose={() => {
        if (!cancelling) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !cancelling) onClose();
      }}
    >
      {/* Narrow on purpose. It asks one question and there is nothing to read
          across — a wide box would put the two buttons a hand's width apart. */}
      <div
        className="modal-box max-w-md bg-base-100 p-8 text-center sm:p-10"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Cyan rather than the error red the action deserves, because the panel
            underneath is where the consequence is stated and one loud thing per
            dialog is the budget. The halo is the same colour at a tenth of it,
            which is what stops a 64px disc reading as a stop sign. */}
        <div
          aria-hidden
          className="mx-auto grid size-20 place-items-center rounded-full bg-cyan-blue/10"
        >
          <span className="grid size-14 place-items-center rounded-full bg-cyan-blue">
            <FaExclamation className="size-6 text-white" />
          </span>
        </div>

        {/* The dialog's own heading, and what `showModal` names it by. Not a
            question mark: this is the label of a decision, and the buttons below
            are the two answers. */}
        <h3 className="mt-6 font-display text-2xl font-bold leading-snug text-dark-teal text-balance">
          Are you sure you want to cancel this booking?
        </h3>

        {/* A panel rather than a line of small print. It is the one fact that
            makes this different from every other button on the page, and set as
            a caption it is the thing nobody reads. */}
        <p className="mt-5 inline-block rounded-field bg-pale-blue px-5 py-3 text-sm font-medium text-dark-teal">
          Cancellation can&rsquo;t be undone.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-box border border-error/40 bg-error/5 p-4 text-sm text-dark-teal"
          >
            {error}
          </p>
        )}

        {/* Stacked and full width, with the destructive one on top — the shape
            of the design, and the shape a thumb expects on a phone. Reversed
            weight from the rest of the app on purpose: here the filled button is
            the one that loses the booking, so the way out is the quiet one, and
            it is directly under the thumb rather than off in a corner. */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={confirm}
            disabled={cancelling}
            /* Darker on hover, not lighter. `/90` was the reflex and it was
               wrong here: fading a near-black towards a white ground makes the
               one committing button look like it is switching off. */
            className="btn h-13 border-none bg-dark-teal font-bold text-white transition-colors hover:bg-[#002926]"
          >
            {cancelling && <span className="loading loading-spinner" />}
            {cancelling ? 'Cancelling…' : 'Cancel booking'}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={cancelling}
            className="btn h-13 border-base-300 bg-base-100 font-bold text-royal-blue transition-colors hover:border-royal-blue hover:bg-pale-blue"
          >
            Back
          </button>
        </div>
      </div>
    </dialog>
  );
}
