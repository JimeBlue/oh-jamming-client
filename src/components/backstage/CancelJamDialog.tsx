'use client';

import { useEffect, useRef } from 'react';
import { FaExclamation } from 'react-icons/fa6';

import type { JamSession } from '@/schemas/jamSession';

type Props = {
  /* Null means closed. One value rather than a `session` plus an `open` flag —
     two would let the dialog be open with nothing to name. */
  session: JamSession | null;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

/* Are you sure — the venue's half of the same question the musician gets in
   `bookings/CancelBookingDialog`, and drawn as the same object on purpose: the
   two are the only destructive dialogs in the app, and a venue who has also
   booked a night as a musician meets both. Divergent shapes would read as two
   different kinds of warning when the stakes are the same kind of thing. */
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
      {/* Narrow on purpose. It asks one question and there is nothing to read
          across — a wide box would put the two buttons a hand's width apart. */}
      <div className="modal-box max-w-md bg-base-100 p-8 text-center sm:p-10">
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

        {/* Space Grotesk, not `font-heading`. Changa One is a display face built
            for three or four words; set at two lines of a question it is harder
            to read than the sentence deserves, and this is the one piece of text
            on the screen that has to be understood before a click. */}
        <h3 className="mt-6 font-display text-2xl leading-snug font-bold text-balance text-dark-teal">
          Are you sure you want to cancel this session?
        </h3>

        {/* The title names the session so the venue can see they're about to
            call off the one they meant — the board can have several nights on it
            with the same shape. Quieter than the question and quieter than the
            panel below it: it is an identifier, not a second thing to weigh. */}
        {session && (
          <p className="mt-3 font-bold text-dark-teal/70">
            &ldquo;{session.title}&rdquo;
          </p>
        )}

        {/* A panel rather than a line of small print. It is the one fact that
            makes this different from every other button on the page, and set as
            a caption it is the thing nobody reads. */}
        <p className="mt-5 inline-block rounded-field bg-pale-blue px-5 py-3 text-sm font-medium text-dark-teal">
          Cancellation can&rsquo;t be undone.
        </p>

        {/* Rendered here rather than closing on failure: a dialog that vanishes
            leaves the venue guessing whether the night is off. */}
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
            the one that calls off the night, so the way out is the quiet one,
            and it is directly under the thumb rather than off in a corner. */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            /* Darker on hover, not lighter. `/90` was the reflex and it was
               wrong here: fading a near-black towards a white ground makes the
               one committing button look like it is switching off. */
            className="btn h-13 border-none bg-dark-teal font-bold text-white transition-colors hover:bg-[#002926]"
          >
            {pending && <span className="loading loading-spinner" />}
            {pending ? 'Cancelling…' : 'Cancel session'}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            /* Focus lands on the way out, not on the way through. <dialog>
               focuses its first focusable child, and with the destructive button
               above this one that would put Enter one keystroke from calling off
               a jam the venue only came here to look at. */
            autoFocus
            className="btn h-13 border-base-300 bg-base-100 font-bold text-royal-blue transition-colors hover:border-royal-blue hover:bg-pale-blue"
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
