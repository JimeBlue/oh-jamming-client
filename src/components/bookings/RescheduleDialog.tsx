'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FaCheck, FaExclamation, FaXmark } from 'react-icons/fa6';

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
   part that will be deleted lives.

   Two faces: the picker, and — once anything has been written — the report. The
   report wears the cancel dialog's shape exactly (disc, heading, panel, one
   button), because by then this is no longer a form and the two dialogs are
   saying the same kind of thing: here is what your booking is now. */

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
      {/* `p-0` and a column, so the footer can be its own band on the pale blue
          while the middle scrolls under it. daisyUI's own padding would put the
          buttons inside the scrolling area, where a long line-up pushes them off
          the bottom of a laptop screen. */}
      <div
        /* The report is a different dialog wearing the same box. Narrow, because
           it asks nothing and there is nothing to read across — at the picker's
           width one sentence sat alone in the middle of a sheet. */
        className={`modal-box flex flex-col overflow-hidden rounded-[1.5rem] bg-base-100 p-0 ${
          result ? 'max-w-md' : 'max-w-3xl'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {result ? (
          <Report result={result} slotLabel={slot && `${slot.startTime} – ${slot.endTime}`}
            jamSessionId={jamSessionId} groupId={groupId} onDone={onDone} />
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-2xl font-bold text-dark-teal">
                    Change your booking
                  </h3>
                  <p className="mt-1.5 text-sm text-dark-teal/60">
                    Pick a different time or different instruments for this jam session.
                  </p>
                </div>

                {/* A tinted square rather than a bare glyph: it sits level with
                    the title on the same white, and at this size an unfilled ×
                    reads as decoration on the heading. */}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  aria-label="Close"
                  className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl bg-pale-blue text-dark-teal transition-colors hover:bg-base-300"
                >
                  <FaXmark className="size-4" />
                </button>
              </div>

              {state.status === 'loading' && (
                <div className="flex justify-center py-16">
                  <span className="loading loading-spinner loading-lg text-cyan-blue" />
                  <span className="sr-only">Loading this jam session</span>
                </div>
              )}

              {state.status === 'error' && (
                <p role="alert" className="mt-8 text-sm text-dark-teal">
                  {state.message}
                </p>
              )}

              {state.status === 'ready' && (
                <>
                  <section className="mt-7">
                    <SectionLabel>Time slot</SectionLabel>

                    <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {slots.map((candidate) => {
                        const isSelected = candidate.slotId === slotId;

                        /* Their own spots don't count towards "full" — in the
                           slot they are booked into, the spots they hold are
                           available to them, and a slot showing Full that they
                           are currently playing in reads as a bug. */
                        const free = candidate.spots.filter(
                          (spot) => spot.bookingId === null || ownSpots.has(spot.spotId),
                        ).length;

                        return (
                          <li key={candidate.slotId}>
                            <button
                              type="button"
                              /* Changing the slot clears the selection, because
                                 a spotId belongs to one slot and carrying
                                 "First Guitar" across would be carrying an id
                                 that means nothing there. Returning to the slot
                                 they are booked into restores what they hold, so
                                 a look at another time costs nothing. */
                              onClick={() => {
                                setSlotId(candidate.slotId);
                                setChosen(
                                  new Set(
                                    candidate.slotId === current.slotId
                                      ? current.spotIds
                                      : [],
                                  ),
                                );
                              }}
                              disabled={free === 0}
                              aria-pressed={isSelected}
                              /* Dark teal for the chosen time and royal blue for
                                 the chosen instruments, which is the design's
                                 own split and worth keeping: the two rows are
                                 different questions, and one colour across both
                                 made the grid read as eleven answers to one. */
                              className={`flex w-full cursor-pointer flex-col gap-0.5 rounded-xl px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                isSelected
                                  ? 'bg-dark-teal text-white'
                                  : 'bg-pale-blue text-dark-teal hover:bg-base-300'
                              }`}
                            >
                              <span className="whitespace-nowrap font-display text-sm font-bold tabular-nums sm:text-base">
                                {candidate.startTime} – {candidate.endTime}
                              </span>
                              <span className="text-xs opacity-70">
                                {free === 0 ? 'Full' : `${free} free`}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>

                  <section className="mt-7">
                    <SectionLabel>Instruments</SectionLabel>

                    {/* A slot id that matches nothing — the venue edited the
                        session after this booking was made. Nothing to pick, and
                        the slot list above is the way out. */}
                    {!slot ? (
                      <p className="mt-3 text-sm text-dark-teal">
                        That time slot is no longer on this session. Pick another one
                        above.
                      </p>
                    ) : (
                      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
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
                                /* A dashed edge on the taken ones, not just a
                                   dimmer solid one: `disabled` already fades
                                   them, and two shades of the same outline is a
                                   difference you have to compare to notice. A
                                   broken line is one you don't. */
                                className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left transition-colors disabled:cursor-not-allowed ${
                                  isChosen
                                    ? 'border-royal-blue bg-royal-blue text-white'
                                    : isTaken
                                      ? 'border-dashed border-base-300 bg-pale-blue text-dark-teal/40'
                                      : 'border-base-300 bg-base-100 text-dark-teal hover:border-royal-blue hover:bg-pale-blue'
                                }`}
                              >
                                <span className="font-bold">{spot.label}</span>
                                {isTaken && (
                                  <span className="shrink-0 text-[0.6875rem] font-bold uppercase tracking-widest">
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
                      <p className="mt-3 text-sm text-dark-teal/60">
                        {MAX_SPOTS_PER_BOOKING} spots is the most you can book in one go.
                      </p>
                    )}
                  </section>

                  {/* The one thing on this dialog the musician cannot change,
                      said once rather than shown as a field they will try to
                      type in. There is no PATCH, so there is no way to change it
                      — see decision 8. */}
                  {current.bandName && (
                    <p className="mt-6 text-sm text-dark-teal/60">
                      Your booking stays under{' '}
                      <span className="font-bold text-dark-teal">{current.bandName}</span>.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Its own band on the pale blue, outside the scrolling area. The two
                buttons stay on screen however long the line-up is, which on a
                ten-instrument night is the difference between finding Save and
                scrolling for it. */}
            <div className="flex shrink-0 flex-col justify-end gap-3 border-t border-base-200 bg-pale-blue px-6 py-5 sm:flex-row sm:px-8">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="btn h-12 rounded-xl border-base-300 bg-base-100 font-bold text-dark-teal transition-colors hover:border-dark-teal hover:bg-base-200"
              >
                Keep my booking
              </button>

              {/* Disabled on an unchanged selection, and that is not tidiness: on
                  this flow saving nothing still cancels the booking and
                  re-creates it, which takes the window and mints a new QR code
                  for a booking identical to the one they already had. */}
              <button
                type="button"
                onClick={save}
                disabled={saving || chosen.size === 0 || unchanged || state.status !== 'ready'}
                className="btn h-12 rounded-xl border-none bg-royal-blue font-bold text-white transition-colors hover:bg-royal-blue/90"
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

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h4 className="font-display text-xs font-bold uppercase tracking-widest text-dark-teal">
    {children}
  </h4>
);

/* What the booking is now — success included.

   The success case has a dialog of its own rather than closing straight out. A
   page that simply redraws behind a vanished modal leaves the musician checking
   the times themselves to find out whether the change took, and this is the one
   flow in the app where "did that work?" has an expensive wrong answer.

   None of these mention the mechanism. A musician does not need to know that
   this is two writes wearing one verb — but they do need to know, exactly, what
   they are holding now. */
const Report = ({
  result,
  slotLabel,
  jamSessionId,
  groupId,
  onDone,
}: {
  result: RescheduleResult;
  /* The new time, for the one outcome where it changed. Absent if the session
     failed to load, which cannot happen on this path — the picker it was chosen
     in was drawn from it — so the wording only has to not fall apart. */
  slotLabel?: string;
  jamSessionId: string;
  groupId: string;
  onDone: (groupId: string) => void;
}) => {
  const done = (id: string) => (
    <button
      type="button"
      onClick={() => onDone(id)}
      className="btn h-13 w-full rounded-xl border-none bg-royal-blue font-bold text-white transition-colors hover:bg-royal-blue/90"
    >
      OK
    </button>
  );

  if (result.outcome === 'changed') {
    return (
      <Shell
        tone="good"
        icon={<FaCheck className="size-6 text-white" />}
        title="Your booking has been changed"
        note={
          slotLabel
            ? `You’re now playing ${slotLabel}.`
            : 'Your new spots are confirmed.'
        }
        action={done(result.groupId)}
      />
    );
  }

  /* The API's own wording, verbatim, under our sentence about the booking. It
     knows which spot went and we do not — "the First Guitar spot at 20:00 is no
     longer available" is a better second line than anything this dialog could
     work out. */
  if (result.outcome === 'untouched') {
    return (
      <Shell
        tone="calm"
        icon={<FaExclamation className="size-6 text-white" />}
        title="Nothing changed"
        note="We couldn’t change your booking, so we left it exactly as it was. Your original spots are still yours."
        detail={result.message}
        action={done(groupId)}
      />
    );
  }

  if (result.outcome === 'restored') {
    return (
      <Shell
        tone="calm"
        icon={<FaExclamation className="size-6 text-white" />}
        title="Your booking is unchanged"
        note="Those spots were taken while we were making the change, so we put your original booking back. You are still playing the slot you were."
        detail={result.message}
        action={done(result.groupId)}
      />
    );
  }

  return (
    <Shell
      tone="bad"
      icon={<FaExclamation className="size-6 text-white" />}
      title="Your booking could not be kept"
      note="Your spots were taken while we were changing your booking, and we could not get them back. You are not booked for this session any more."
      detail={result.message}
      action={
        <Link
          href={`/jams/${jamSessionId}`}
          className="btn h-13 w-full rounded-xl border-none bg-royal-blue font-bold text-white transition-colors hover:bg-royal-blue/90"
        >
          See what&rsquo;s still free
        </Link>
      }
    />
  );
};

/* The cancel dialog's shape, shared by all four outcomes: a disc, a heading, the
   one fact in a panel, and a single button. Kept here rather than lifted into a
   component both files import — they are two dialogs that happen to agree today,
   and the cancel one has no `detail` line and never will. */
const Shell = ({
  tone,
  icon,
  title,
  note,
  detail,
  action,
}: {
  tone: 'good' | 'calm' | 'bad';
  icon: React.ReactNode;
  title: string;
  note: string;
  detail?: string;
  action: React.ReactNode;
}) => (
  /* `role="alert"` whatever the news: it arrived without the musician doing
     anything more, and it is the only thing on the dialog now. */
  <div role="alert" className="p-8 text-center sm:p-10">
    <div
      aria-hidden
      className={`mx-auto grid size-20 place-items-center rounded-full ${
        tone === 'good'
          ? 'bg-emerald-green/10'
          : tone === 'bad'
            ? 'bg-error/10'
            : 'bg-cyan-blue/10'
      }`}
    >
      <span
        className={`grid size-14 place-items-center rounded-full ${
          tone === 'good' ? 'bg-emerald-green' : tone === 'bad' ? 'bg-error' : 'bg-cyan-blue'
        }`}
      >
        {icon}
      </span>
    </div>

    <h3 className="mt-6 font-display text-2xl font-bold leading-snug text-dark-teal text-balance">
      {title}
    </h3>

    <p className="mt-5 inline-block rounded-field bg-pale-blue px-5 py-3 text-sm font-medium text-dark-teal text-pretty">
      {note}
    </p>

    {/* The server's sentence, held back from ours: it explains the cause, and
        read at the same weight it competes with the outcome. */}
    {detail && <p className="mt-4 text-sm text-dark-teal/60 text-pretty">{detail}</p>}

    <div className="mt-8">{action}</div>
  </div>
);
