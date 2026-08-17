'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FaXmark } from 'react-icons/fa6';

import {
  isSameSelection,
  rescheduleBooking,
  type RescheduleResult,
  type RescheduleSelection,
} from '@/lib/rescheduleBooking';
import { MAX_SPOTS_PER_BOOKING } from '@/schemas/booking';
import type { JamSession } from '@/schemas/jamSession';
import { ApiError } from '@/services/api';
import { getJamSession } from '@/services/jamSessions';

/* Change booking: a different time, different instruments, same night.

   A modal, while the details page it opens from is a route (decision 11). Not a
   contradiction — the details page is a destination and this is a detour from it
   that you either finish or abandon. A third route would also lose the one thing
   worth keeping in view: the booking being changed is still behind it.

   Same session throughout (decision 7). `POST /bookings` takes one
   `jamSessionId`, and playing a different night is a different booking by any
   reading — there is no edit that turns one into the other.

   The slots are fetched fresh on open rather than read off the booking. The
   booking knows its own times and nothing about who has claimed what since, and
   a picker drawn from stale availability offers spots that will 409. What the
   flow does with all this is in `lib/rescheduleBooking.ts`, which is where the
   part that will be deleted lives. */

type DialogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; session: JamSession };

const asMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

/* Mounted only while open — the details page renders it or it doesn't, rather
   than passing an `open` flag. Every reopening is then a fresh component with a
   fresh fetch and no stale selection, without an effect reaching back to reset
   state it already owns. */
type RescheduleDialogProps = {
  jamSessionId: string;
  groupId: string;
  /* What the musician holds now: the slot, the spots inside it, and the band
     name that has to survive the rebuild. */
  current: RescheduleSelection;
  onClose: () => void;
  /* Called with the group the page should be showing afterwards — a new id when
     anything was written, the old one when nothing was. Every path through this
     flow ends at some group, including the failures, which is why there is one
     callback rather than one per outcome. */
  onDone: (groupId: string) => void;
};

export default function RescheduleDialog({
  jamSessionId,
  groupId,
  current,
  onClose,
  onDone,
}: RescheduleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [state, setState] = useState<DialogState>({ status: 'loading' });
  const [slotId, setSlotId] = useState(current.slotId);
  const [chosen, setChosen] = useState<Set<string>>(new Set(current.spotIds));
  const [saving, setSaving] = useState(false);

  /* Set once and never cleared: past this point the booking has been written to
     — or deliberately not — and the dialog stops being a picker and becomes the
     report of what happened. */
  const [result, setResult] = useState<RescheduleResult | null>(null);

  /* `showModal()` is the only thing that gives a `<dialog>` the top layer, the
     focus trap, the backdrop and the inert page behind it. Rendered with the
     classes and without this call it is simply display:none. */
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    let active = true;

    getJamSession(jamSessionId)
      .then((session) => {
        if (active) setState({ status: 'ready', session });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: asMessage(error) });
      });

    return () => {
      active = false;
    };
  }, [jamSessionId]);

  /* The spots this musician is holding. The session was fetched before anything
     was cancelled, so their own spots come back with a `bookingId` on them and
     the rule that draws a claimed spot as Taken would grey out the very booking
     being edited. This set is the exception, and it is the one behavioural
     difference between this picker and `InstrumentPicker` — the reason that
     component could not simply be reused.

     Only inside the current slot. A spot id is a slot's own, so in any other
     slot there is nothing here to match. */
  const ownSpots = new Set(current.spotIds);

  const selection: RescheduleSelection = {
    slotId,
    spotIds: [...chosen],
    bandName: current.bandName,
  };

  const unchanged = isSameSelection(selection, current);

  const save = async () => {
    setSaving(true);

    const outcome = await rescheduleBooking({
      jamSessionId,
      groupId,
      current,
      next: selection,
    });

    /* Straight out on the happy path: there is nothing to report that the
       redrawn page won't say better, and a dialog that stays open to be
       dismissed is a step the musician didn't ask for. Every other outcome has
       something to say, so it stays and says it. */
    if (outcome.outcome === 'changed') {
      onDone(outcome.groupId);

      return;
    }

    setSaving(false);
    setResult(outcome);
  };

  const slots = state.status === 'ready' ? state.session.slots : [];
  const slot = slots.find((candidate) => candidate.slotId === slotId);
  const atLimit = chosen.size >= MAX_SPOTS_PER_BOOKING;

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      /* Escape closes a modal dialog without asking React, so the page would go
         on thinking this was open and the button that opens it would stop
         responding. `close` rather than `cancel` because it fires however the
         dialog was dismissed. Ignored once a result is showing: the page has to
         be told which booking to draw, and that is `onDone`'s job. */
      onClose={() => {
        if (!result) onClose();
      }}
      /* A click on the backdrop lands on the dialog element itself — everything
         visible is inside modal-box, which stops its own clicks here. Not while
         the requests are out: a stray click on the backdrop would leave a cancel
         and a create running with nothing left to report their outcome to. */
      onClick={(event) => {
        if (event.target === dialogRef.current && !saving && !result) onClose();
      }}
    >
      <div
        className="modal-box max-w-2xl bg-base-100"
        onClick={(event) => event.stopPropagation()}
      >
        {!saving && !result && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn btn-circle btn-ghost btn-sm absolute right-3 top-3"
          >
            <FaXmark className="size-4" />
          </button>
        )}

        <h3 className="font-display text-2xl font-bold text-dark-teal">
          {result ? 'Your booking' : 'Change your booking'}
        </h3>

        {result ? (
          <Outcome result={result} jamSessionId={jamSessionId} onDone={onDone} groupId={groupId} />
        ) : (
          <>
            <p className="mt-1.5 text-sm text-dark-teal/60">
              Pick a different time or different instruments for this jam session.
            </p>

            {state.status === 'loading' && (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg text-cyan-blue" />
                <span className="sr-only">Loading this jam session</span>
              </div>
            )}

            {state.status === 'error' && (
              <p role="alert" className="mt-6 text-sm text-dark-teal">
                {state.message}
              </p>
            )}

            {state.status === 'ready' && (
              <div className="mt-6 space-y-6">
                <section>
                  <h4 className="text-xs font-medium text-dark-teal/60">Time slot</h4>
                  <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2.5">
                    {slots.map((candidate) => {
                      const isSelected = candidate.slotId === slotId;

                      /* Their own spots don't count towards "full" — in the slot
                         they are booked into, the spots they hold are available
                         to them, and a slot showing Full that they are currently
                         playing in reads as a bug. */
                      const free = candidate.spots.filter(
                        (spot) => spot.bookingId === null || ownSpots.has(spot.spotId),
                      ).length;

                      return (
                        <li key={candidate.slotId}>
                          <button
                            type="button"
                            /* Changing the slot clears the selection, because a
                               spotId belongs to one slot and carrying "First
                               Guitar" across would be carrying an id that means
                               nothing there. Returning to the slot they are
                               booked into restores what they hold, so a look at
                               another time costs nothing. */
                            onClick={() => {
                              setSlotId(candidate.slotId);
                              setChosen(
                                new Set(
                                  candidate.slotId === current.slotId ? current.spotIds : [],
                                ),
                              );
                            }}
                            disabled={free === 0}
                            aria-pressed={isSelected}
                            className={`flex w-full cursor-pointer flex-col gap-0.5 rounded-box px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                              isSelected
                                ? 'bg-royal-blue text-white'
                                : 'bg-pale-blue text-dark-teal hover:bg-pale-blue/60'
                            }`}
                          >
                            <span className="whitespace-nowrap font-display font-bold tabular-nums">
                              {candidate.startTime} – {candidate.endTime}
                            </span>
                            <span className="text-xs opacity-75">
                              {free === 0 ? 'Full' : `${free} free`}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section>
                  <h4 className="text-xs font-medium text-dark-teal/60">Instruments</h4>

                  {/* A slot id that matches nothing — the venue edited the
                      session after this booking was made. Nothing to pick, and
                      the slot list above is the way out. */}
                  {!slot ? (
                    <p className="mt-2 text-sm text-dark-teal">
                      That time slot is no longer on this session. Pick another one above.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {slot.spots.map((spot) => {
                        const isOwn = ownSpots.has(spot.spotId);
                        const isTaken = spot.bookingId !== null && !isOwn;
                        const isChosen = chosen.has(spot.spotId);

                        return (
                          <li key={spot.spotId}>
                            <button
                              type="button"
                              onClick={() => {
                                const next = new Set(chosen);

                                if (!next.delete(spot.spotId)) next.add(spot.spotId);

                                setChosen(next);
                              }}
                              disabled={isTaken || (atLimit && !isChosen)}
                              aria-pressed={isChosen}
                              className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded-box border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                isChosen
                                  ? 'border-royal-blue bg-royal-blue text-white'
                                  : 'border-base-300 bg-base-100 text-dark-teal hover:border-royal-blue'
                              }`}
                            >
                              <span className="font-bold">{spot.label}</span>
                              {isTaken && (
                                <span className="text-sm font-bold text-dark-teal/60">
                                  Taken
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {atLimit && (
                    <p className="mt-2 text-sm text-dark-teal/60">
                      {MAX_SPOTS_PER_BOOKING} spots is the most you can book in one go.
                    </p>
                  )}
                </section>

                {/* The one thing on this dialog the musician cannot change, said
                    once rather than shown as a field they will try to type in.
                    There is no PATCH, so there is no way to change it — see
                    decision 8. */}
                {current.bandName && (
                  <p className="text-sm text-dark-teal/60">
                    Your booking stays under{' '}
                    <span className="font-bold text-dark-teal">{current.bandName}</span>.
                  </p>
                )}
              </div>
            )}

            <div className="modal-action">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="btn h-12 border-base-300 bg-base-100 font-bold text-dark-teal"
              >
                Keep my booking
              </button>

              {/* Disabled on an unchanged selection, and that is not tidiness: on
                  this flow saving nothing still cancels the booking and re-creates
                  it, which takes the window and mints a new QR code for a booking
                  identical to the one they already had. */}
              <button
                type="button"
                onClick={save}
                disabled={saving || chosen.size === 0 || unchanged || state.status !== 'ready'}
                className="btn h-12 border-none bg-royal-blue font-bold text-white hover:bg-royal-blue/90"
              >
                {saving && <span className="loading loading-spinner" />}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

/* What happened, when what happened isn't simply "it worked".

   Each of these is about the booking, not about the requests. A musician does
   not need to know that this flow is two writes wearing one verb — but they do
   need to know, exactly, what they are holding now. */
const Outcome = ({
  result,
  jamSessionId,
  groupId,
  onDone,
}: {
  result: RescheduleResult;
  jamSessionId: string;
  groupId: string;
  onDone: (groupId: string) => void;
}) => {
  if (result.outcome === 'changed') return null;

  /* The API's own wording, verbatim, under our sentence about the booking. It
     knows which spot went and we do not — "the First Guitar spot at 20:00 is no
     longer available" is a better second line than anything this dialog could
     work out. */
  const detail = <p className="mt-2 text-sm text-dark-teal/70">{result.message}</p>;

  if (result.outcome === 'untouched') {
    return (
      <Report
        tone="calm"
        title="Nothing changed"
        detail={detail}
        action={
          <button
            type="button"
            onClick={() => onDone(groupId)}
            className="btn h-12 border-none bg-royal-blue font-bold text-white hover:bg-royal-blue/90"
          >
            Close
          </button>
        }
      >
        We couldn&rsquo;t change your booking, so we left it exactly as it was. Your
        original spots are still yours.
      </Report>
    );
  }

  if (result.outcome === 'restored') {
    return (
      <Report
        tone="calm"
        title="Your booking is unchanged"
        detail={detail}
        action={
          <button
            type="button"
            onClick={() => onDone(result.groupId)}
            className="btn h-12 border-none bg-royal-blue font-bold text-white hover:bg-royal-blue/90"
          >
            Close
          </button>
        }
      >
        Those spots were taken while we were making the change, so we put your
        original booking back. You are still playing the slot you were.
      </Report>
    );
  }

  return (
    <Report
      tone="bad"
      title="Your booking could not be kept"
      detail={detail}
      action={
        <Link
          href={`/jams/${jamSessionId}`}
          className="btn h-12 border-none bg-royal-blue font-bold text-white hover:bg-royal-blue/90"
        >
          See what&rsquo;s still free
        </Link>
      }
    >
      Your spots were taken while we were changing your booking, and we could not
      get them back. You are not booked for this session any more.
    </Report>
  );
};

const Report = ({
  tone,
  title,
  detail,
  action,
  children,
}: {
  tone: 'calm' | 'bad';
  title: string;
  detail: React.ReactNode;
  action: React.ReactNode;
  children: React.ReactNode;
}) => (
  <>
    {/* `role="alert"` on all three, including the calm ones: whatever the news,
        it arrived without the musician doing anything and it is the only thing
        on the dialog now. A tinted panel rather than daisyUI's `alert-*`, which
        in this theme are solid loud blocks. */}
    <div
      role="alert"
      className={`mt-5 rounded-box border p-5 ${
        tone === 'bad' ? 'border-error/40 bg-error/5' : 'border-royal-blue/30 bg-pale-blue'
      }`}
    >
      <p className="font-display font-bold text-dark-teal">{title}</p>
      <p className="mt-2 text-sm text-dark-teal">{children}</p>
      {detail}
    </div>

    <div className="modal-action">{action}</div>
  </>
);
