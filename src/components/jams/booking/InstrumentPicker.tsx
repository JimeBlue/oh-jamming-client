'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa6';

import { formatListingDate } from '@/lib/jamListing';
import { utcMidnightToDateString } from '@/lib/time';
import { MAX_SPOTS_PER_BOOKING } from '@/schemas/booking';
import type { JamSession } from '@/schemas/jamSession';
import { ApiError } from '@/services/api';
import { getJamSession } from '@/services/jamSessions';

/* Step two: which instruments, inside the slot chosen on the page before.

   The spots come from the session rather than from its `instrumentTemplate`.
   They look alike — the template is what every slot is built from — but only the
   slot's own spots carry a `spotId` and a `bookingId`, and those are the two
   things this step exists to read: what to claim, and what is already gone.

   `label` is the API's own wording ("First Guitar", or bare "Drums" where the
   venue offered one), generated in `generateSlots`. Composing it here from the
   instrument and an index would be a second implementation of a name a musician
   will see again on their booking card and on the venue's guest list. */

type PickerState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; session: JamSession };

const asMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

export default function InstrumentPicker({
  id,
  slotId,
}: {
  id: string;
  slotId: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<PickerState>({ status: 'loading' });

  /* A Set rather than an array: this is membership, and every read below asks
     "is this one in?". Re-created on each change rather than mutated, or React
     sees the same reference and skips the render. */
  const [chosen, setChosen] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    getJamSession(id)
      .then((session) => {
        if (active) setState({ status: 'ready', session });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: asMessage(error) });
      });

    return () => {
      active = false;
    };
  }, [id]);

  const toggle = (spotId: string) =>
    setChosen((current) => {
      const next = new Set(current);

      if (!next.delete(spotId)) next.add(spotId);

      return next;
    });

  /* Back to the slot list with the slot still lit — the same `?slot=` the login
     gate uses. Changing your mind about the time shouldn't mean finding it
     again. */
  const backHref = `/jams/${id}?slot=${encodeURIComponent(slotId)}`;

  if (state.status === 'loading') {
    return (
      <Card>
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="sr-only">Loading this jam session</span>
        </div>
      </Card>
    );
  }

  if (state.status === 'error') {
    return (
      <Card>
        <p role="alert" className="text-sm">
          {state.message}
        </p>
        <BackLink href={`/jams/${id}`} />
      </Card>
    );
  }

  const slot = state.session.slots.find((candidate) => candidate.slotId === slotId);

  /* A slot id that matches nothing — a hand-edited URL, or a session the venue
     has edited since the link was made. Back to the list rather than an error
     page: the slots that do exist are one click away. */
  if (!slot) {
    return (
      <Card>
        <h1 className="font-heading text-2xl">That time slot isn&rsquo;t available</h1>
        <p className="mt-3 text-sm opacity-80">
          It may have been changed since you opened this page. Pick another one.
        </p>
        <BackLink href={`/jams/${id}`} />
      </Card>
    );
  }

  const atLimit = chosen.size >= MAX_SPOTS_PER_BOOKING;

  return (
    <Card>
      {/* The two facts a musician needs to know they are in the right place, and
          the ones they would otherwise have to remember across a login. Time
          first: the date is fixed by the page they came from, the slot is the
          thing they chose. */}
      <h1 className="font-heading text-2xl tabular-nums">
        {slot.startTime} – {slot.endTime}
      </h1>
      <p className="mt-1 text-sm opacity-70">
        {formatListingDate(utcMidnightToDateString(state.session.date))}
      </p>

      <p className="mt-6 text-sm font-bold">
        Click on an instrument to select it. You can book more than one spot in
        this slot.
      </p>

      <ul className="mt-3 space-y-2">
        {slot.spots.map((spot) => {
          const isTaken = spot.bookingId !== null;
          const isChosen = chosen.has(spot.spotId);

          return (
            <li key={spot.spotId}>
              <button
                type="button"
                onClick={() => toggle(spot.spotId)}
                /* Taken spots stay on the list — a musician deciding whether to
                   come wants to see the band that is already forming, not a
                   shorter list with no explanation. Nothing is behind them.

                   The limit disables what isn't already chosen, so the eleventh
                   click does nothing rather than being accepted here and refused
                   by the API after the summary. Deselecting still works. */
                disabled={isTaken || (atLimit && !isChosen)}
                aria-pressed={isChosen}
                className={`flex w-full items-center justify-between gap-3 rounded-field border px-4 py-3 text-left transition-colors disabled:opacity-50 ${
                  isChosen
                    ? 'border-primary bg-primary text-primary-content'
                    : 'border-base-300 bg-base-100 hover:border-primary'
                }`}
              >
                <span className="font-bold">{spot.label}</span>
                {isTaken && (
                  <span className="text-sm font-bold text-brand-pink-deep">Taken</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {atLimit && (
        <p className="mt-3 text-sm opacity-70">
          {MAX_SPOTS_PER_BOOKING} spots is the most you can book in one go.
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Link href={backHref} className="btn btn-outline btn-primary font-bold">
          <FaArrowLeft aria-hidden className="size-4" />
          Back
        </Link>

        <button
          type="button"
          /* Nothing to confirm without a spot, and `spotIds` has to hold at
             least one for the API to accept the booking at all. */
          disabled={chosen.size === 0}
          onClick={() =>
            router.push(
              `/jams/${id}/book/summary?slot=${encodeURIComponent(slotId)}&spots=${[
                ...chosen,
              ]
                .map(encodeURIComponent)
                .join(',')}`,
            )
          }
          className="btn btn-primary font-bold"
        >
          Next
          <FaArrowRight aria-hidden className="size-4" />
        </button>
      </div>
    </Card>
  );
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <section className="rounded-box bg-base-100 p-6 text-base-content shadow-lg sm:p-8">
    {children}
  </section>
);

const BackLink = ({ href }: { href: string }) => (
  <Link href={href} className="btn btn-outline btn-primary mt-6 font-bold">
    <FaArrowLeft aria-hidden className="size-4" />
    Back to the jam
  </Link>
);
