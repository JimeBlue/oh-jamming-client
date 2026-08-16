'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaRegCalendar } from 'react-icons/fa6';
import { HiUserGroup } from 'react-icons/hi';
import { MdFactCheck } from 'react-icons/md';
import { RiTimerFlashLine } from 'react-icons/ri';

import electricGuitar from '@/assets/electric-guitar.png';
import MaskIcon from '@/components/ui/MaskIcon';
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
  initialSpotIds,
  initialBandName,
}: {
  id: string;
  slotId: string;
  initialSpotIds: string[];
  initialBandName: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<PickerState>({ status: 'loading' });

  /* A Set rather than an array: this is membership, and every read below asks
     "is this one in?". Re-created on each change rather than mutated, or React
     sees the same reference and skips the render.

     Seeded from `?spots=` so coming back from the summary shows what was picked
     rather than an empty list. */
  const [chosen, setChosen] = useState<Set<string>>(new Set(initialSpotIds));

  /* Collected here rather than on the summary, so every choice the booking is
     made of is made on one page and the summary is only a re-reading of them.
     Seeded from `?band=` for the same reason the spots are: Back from the
     summary has to bring it with it. */
  const [bandName, setBandName] = useState(initialBandName);

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

  /* The query both steps of the flow are addressed by, given a selection. One
     builder for the toggle below and for Next, so the address bar and the page
     it leads to can't disagree about what was picked.

     `band` is left off entirely when empty rather than sent as `band=`: absent
     and blank mean the same thing here, and one of them doesn't sit in the
     address bar of every musician who skipped the field. Typing does not call
     this — only toggling a spot and pressing Next do — so a name is written to
     the URL once, not once per keystroke. */
  const stepQuery = (spotIds: Iterable<string>, band: string) => {
    const trimmed = band.trim();

    return (
      `?slot=${encodeURIComponent(slotId)}&spots=${[...spotIds]
        .map(encodeURIComponent)
        .join(',')}` + (trimmed ? `&band=${encodeURIComponent(trimmed)}` : '')
    );
  };

  const toggle = (spotId: string) => {
    const next = new Set(chosen);

    if (!next.delete(spotId)) next.add(spotId);

    setChosen(next);

    /* `replace`, not `push`: every tap would otherwise be its own history entry,
       and backing out of a five-instrument booking would take five presses. This
       leaves one entry for the step and keeps it current, which is what makes the
       browser's own back button restore the selection instead of an empty list.

       `scroll: false` because the default is to jump to the top, and a musician
       choosing their fourth instrument is somewhere down the list. */
    router.replace(`/jams/${id}/book${stepQuery(next, bandName)}`, { scroll: false });
  };

  /* The API's own floor. One character is the only value that can't be sent and
     can't be omitted either, so it is caught here rather than coming back as a
     400 for the whole booking two pages later. */
  const bandNameTooShort = bandName.trim().length === 1;

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
        <p className="mt-3 text-sm">
          It may have been changed since you opened this page. Pick another one.
        </p>
        <BackLink href={`/jams/${id}`} />
      </Card>
    );
  }

  const atLimit = chosen.size >= MAX_SPOTS_PER_BOOKING;

  return (
    <Card>
      {/* The same header the slot card wears, one step on: what to do on the
          left, and on the right the two facts a musician would otherwise have to
          remember across a login — the night's date, and the slot they picked. */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-base-200 pb-6">
        <div className="flex items-start gap-3">
          {/* Black artwork on transparency, painted indigo through its own alpha
              rather than committed a second time in a second colour. */}
          {/* Smaller on a phone, where the header has wrapped and a 36px glyph
              sits next to a title that has broken onto two lines. */}
          <MaskIcon src={electricGuitar.src} className="size-7 bg-primary sm:size-9" />
          <div>
            <h1 className="font-display text-xl font-bold">Choose your instruments</h1>
            {/* Two lines by construction rather than by where the box happens to
                wrap: they are two separate instructions, and the second one is
                the surprising half. */}
            <p className="mt-1 text-sm">
              <span className="block">Click on an instrument to select it.</span>
              <span className="block">
                You can book more than one spot in this slot.
              </span>
            </p>
          </div>
        </div>

        {/* Pushed right as a block, not row by row: right-aligning each line
            separately puts the two icons in different columns.

            Only from `sm` up. On a phone the header has wrapped to two rows, and
            `ml-auto` would strand these against the right edge — under a title
            that starts at the left, with nothing above them to line up with. */}
        <dl className="w-fit space-y-1 text-sm sm:ml-auto">
          <div className="flex items-center gap-2">
            <FaRegCalendar aria-hidden className="size-4 shrink-0 text-primary" />
            <dt className="sr-only">Date</dt>
            <dd>{formatListingDate(utcMidnightToDateString(state.session.date))}</dd>
          </div>
          <div className="flex items-center gap-2">
            <RiTimerFlashLine aria-hidden className="size-4 shrink-0 text-primary" />
            <dt>Your time slot:</dt>
            <dd className="font-bold tabular-nums">
              {slot.startTime} – {slot.endTime}
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-6 flex items-center gap-2 text-sm font-bold text-primary">
        <MdFactCheck aria-hidden className="size-4" />
        Available instruments
      </p>

      <ul className="mt-3 space-y-2.5">
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
                className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded-box border px-5 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isChosen
                    ? 'border-primary bg-primary text-primary-content'
                    : 'border-base-300 bg-base-100 hover:border-primary'
                }`}
              >
                <span className="font-bold">{spot.label}</span>
                {isTaken && (
                  <span className="text-sm font-bold text-base-content/60">Taken</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {atLimit && (
        <p className="mt-3 text-sm text-base-content/60">
          {MAX_SPOTS_PER_BOOKING} spots is the most you can book in one go.
        </p>
      )}

      {/* Under the instruments because it describes them: every spot in a
          booking is inside the same slot, so two of them is two people, and this
          is what the venue's guest list calls that group.

          Never required — BK09, "required when claiming more than one spot", is
          deferred on the API, and enforcing it here alone would be a rule only
          half the system believes in. Plenty of pairs have no name. */}
      {/* A wider gap than the one between the sections above it: the list ends
          and a different kind of question starts, and at `mt-6` the label read
          as a caption on the last instrument. */}
      <label className="mt-10 block">
        {/* The same line as "Available instruments" above it — icon, indigo,
            small and bold — so the field reads as the next section of the step
            rather than as a stray input. */}
        <span className="flex items-center gap-2 text-sm font-bold text-primary">
          <HiUserGroup aria-hidden className="size-4" />
          Band name (optional)
        </span>
        <input
          type="text"
          value={bandName}
          onChange={(event) => setBandName(event.target.value)}
          placeholder="The name your venue should expect at the door"
          /* The API's ceiling, enforced by the browser so a long name is stopped
             as it is typed rather than refused after the button. */
          maxLength={120}
          aria-invalid={bandNameTooShort ? true : undefined}
          aria-describedby={bandNameTooShort ? 'band-name-error' : undefined}
          className={`input mt-2 w-full ${bandNameTooShort ? 'input-error' : ''}`}
        />
      </label>

      {bandNameTooShort && (
        <p id="band-name-error" role="alert" className="mt-2 text-sm text-error">
          Use at least 2 characters, or leave it empty
        </p>
      )}

      <div className="mt-10 flex items-center justify-between gap-3">
        <Link href={backHref} className="btn btn-outline btn-primary font-bold">
          <FaArrowLeft aria-hidden className="size-4" />
          Back
        </Link>

        <button
          type="button"
          /* Nothing to confirm without a spot, and `spotIds` has to hold at
             least one for the API to accept the booking at all. */
          disabled={chosen.size === 0 || bandNameTooShort}
          onClick={() =>
            router.push(`/jams/${id}/book/summary${stepQuery(chosen, bandName)}`)
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
