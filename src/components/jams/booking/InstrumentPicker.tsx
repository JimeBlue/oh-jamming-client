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
   will see again on their booking card and on the venue's guest list.

   Three blocks rather than one card, which is the re-brand: royal blue for what
   is being asked, cyan for the instruments themselves, white for the two things
   that finish the step. The colours are the browse's — royal blue is the action,
   cyan is the full-bleed band — so a musician arriving from a card meets the
   same two blues doing the same two jobs. */

type PickerState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; session: JamSession };

const asMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

/* The small uppercase line each block opens with. One component because there
   are four of them across three grounds and only the colour changes — the
   tracking and the weight are what make them read as the same device. */
const Eyebrow = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <p className={`font-display text-xs font-bold uppercase tracking-[0.18em] ${className}`}>
    {children}
  </p>
);

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
          <span className="loading loading-spinner loading-lg text-royal-blue" />
          <span className="sr-only">Loading this jam session</span>
        </div>
      </Card>
    );
  }

  if (state.status === 'error') {
    return (
      <Card>
        <p role="alert" className="text-sm text-dark-teal">
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
        <h1 className="font-display text-2xl font-bold text-dark-teal">
          That time slot isn&rsquo;t available
        </h1>
        <p className="mt-3 text-sm text-dark-teal/80">
          It may have been changed since you opened this page. Pick another one.
        </p>
        <BackLink href={`/jams/${id}`} />
      </Card>
    );
  }

  const atLimit = chosen.size >= MAX_SPOTS_PER_BOOKING;

  return (
    <>
      {/* What is being asked, on the page's action colour. The guitar glyph that
          used to lead it is gone with the design: on a solid blue block the
          heading is already the loudest thing, and a masked PNG beside it was
          competing with it in the same white. */}
      <section className="rounded-box bg-royal-blue px-6 py-7 text-white sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="lg:max-w-lg">
            {/* The kind of night, not its length. The slot's own minutes are one
                line to the right in the hours a musician actually turns up at,
                which is the form the same fact is useful in. */}
            <Eyebrow className="text-white/70">Open jam</Eyebrow>

            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              Choose your instruments
            </h1>

            {/* Two sentences, and the second is the surprising half — the list
                below takes as many taps as you like, which is not what a list of
                options usually means. */}
            <p className="mt-3 text-white/85">
              Pick one or more spots for this slot. Every instrument you take is one
              seat on stage.
            </p>
          </div>

          {/* The two facts a musician would otherwise have to remember across a
              login, in a panel of the same blue lightened rather than a second
              colour: it belongs to the heading beside it, and a white card here
              would read as the first thing to interact with.

              Dots rather than the calendar and stopwatch glyphs it used to
              carry. Two icons on a block this dense were decoration standing
              where the words are, and the cyan one still does the one job an
              icon was doing — marking which of the two lines is the choice
              already made. */}
          {/* `shrink-0` and no wrapping inside: the heading beside it is the
              half that should reflow, and left to itself this panel broke
              "21:00 – 21:15" away from the label it belongs to. */}
          <dl className="w-fit shrink-0 space-y-1.5 rounded-box bg-white/15 px-5 py-4 text-sm whitespace-nowrap">
            <div className="flex items-center gap-3">
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-white/50" />
              <dt className="sr-only">Date</dt>
              {/* Set exactly like the line under it. The two are the same kind
                  of fact — when the night is, and when your part of it is — and
                  dimming one of them made the panel read as a heading over a
                  detail rather than as a pair. */}
              <dd className="font-bold">
                {formatListingDate(utcMidnightToDateString(state.session.date))}
              </dd>
            </div>
            <div className="flex items-center gap-3">
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-cyan-blue" />
              <dt className="font-bold">Your time slot:</dt>
              <dd className="font-bold tabular-nums">
                {slot.startTime} – {slot.endTime}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* The instruments, on the cyan the browse's band and the home page's
          stats are drawn on. It is the block a musician is here to work in, and
          giving it the page's other colour is what stops the white pills reading
          as a continuation of the form below them. */}
      <section aria-labelledby="instruments-heading" className="rounded-box bg-cyan-blue px-6 py-7 sm:px-8">
        <Eyebrow className="text-white">
          <span id="instruments-heading">Available instruments</span>
        </Eyebrow>

        {/* One flat run in the order the slot carries them, which is the order
            the venue typed the line-up in — so "First Guitar" comes before
            "Second Guitar" and the guitars stay together without anything here
            deciding that they should.

            Four across at the widest, matching the block's own width rather than
            the pills' content: a row of even columns is what makes "First
            Guitar" and "Bass" read as the same kind of choice. */}
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {slot.spots.map((spot) => {
            const isTaken = spot.bookingId !== null;
            const isChosen = chosen.has(spot.spotId);

            return (
              <li key={spot.spotId}>
                <button
                  type="button"
                  onClick={() => toggle(spot.spotId)}
                  /* Taken spots stay on the list — a musician deciding whether
                     to come wants to see the band that is already forming, not a
                     shorter list with no explanation. Nothing is behind them.

                     The limit disables what isn't already chosen, so the
                     eleventh click does nothing rather than being accepted here
                     and refused by the API after the summary. Deselecting still
                     works. */
                  disabled={isTaken || (atLimit && !isChosen)}
                  aria-pressed={isChosen}
                  /* Royal blue for chosen, white for free, and the hover is the
                     lift the slot tiles on the step before make — the same
                     gesture for the same kind of choice, one page apart. Nothing
                     is added to the pill's edge: on this cyan a white tile is
                     already the loudest thing in the grid, and an outline on
                     hover was drawing a line around something nobody could
                     miss. */
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-field px-5 py-3 text-left font-bold transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:translate-y-0 disabled:cursor-not-allowed ${
                    isChosen
                      ? 'bg-royal-blue text-white'
                      : 'bg-base-100 text-dark-teal disabled:bg-base-100/50 disabled:text-dark-teal/50'
                  }`}
                >
                  <span>{spot.label}</span>
                  {isTaken && (
                    <span className="text-xs font-bold uppercase tracking-wider">Taken</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {atLimit && (
          <p className="mt-5 text-sm font-medium text-white/85">
            {MAX_SPOTS_PER_BOOKING} spots is the most you can book in one go.
          </p>
        )}
      </section>

      {/* The band name and the two ways out of the step, on one white card:
          together they are what a musician does once the choosing is finished,
          and the design's ground change is what says the list above is done. */}
      <Card>
        {/* Under the instruments because it describes them: every spot in a
            booking is inside the same slot, so two of them is two people, and
            this is what the venue's guest list calls that group.

            Never required — BK09, "required when claiming more than one spot",
            is deferred on the API, and enforcing it here alone would be a rule
            only half the system believes in. Plenty of pairs have no name. */}
        <label className="block">
          <Eyebrow className="text-royal-blue">Band name (optional)</Eyebrow>

          <input
            type="text"
            value={bandName}
            onChange={(event) => setBandName(event.target.value)}
            placeholder="The name your venue should expect at the door"
            /* The API's ceiling, enforced by the browser so a long name is
               stopped as it is typed rather than refused after the button. */
            maxLength={120}
            aria-invalid={bandNameTooShort ? true : undefined}
            aria-describedby={bandNameTooShort ? 'band-name-error' : undefined}
            /* The pale field the browse's filters use, on the same white plate.
               Borderless with a hairline ring, so the box is legible against the
               card without drawing a second edge inside it. */
            className={`input mt-3 h-12 w-full border-0 bg-pale-blue text-dark-teal ring-1 focus:outline-2 focus:outline-offset-[-2px] ${
              bandNameTooShort
                ? 'ring-error focus:outline-error'
                : 'ring-dark-teal/10 focus:outline-royal-blue'
            }`}
          />
        </label>

        {bandNameTooShort && (
          <p id="band-name-error" role="alert" className="mt-2 text-sm text-error">
            Use at least 2 characters, or leave it empty
          </p>
        )}

        {/* A rule rather than a gap: the field above is a question and the row
            below is the answer to the whole step, and at this width nothing else
            separates them. */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-dark-teal/10 pt-6">
          {/* The arrows sit on the side they point to, which is the only thing
              telling these two apart at a glance once both are the same blue. */}
          <Link
            href={backHref}
            className="btn border-royal-blue bg-transparent font-bold text-royal-blue shadow-none hover:bg-royal-blue hover:text-white"
          >
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
            /* The disabled treatment is written out rather than left to
               daisyUI, and it is the one the slot step's Next wears: a muted
               dark teal that still reads as a button waiting for something.
               daisyUI's own is a grey fill, which on a white card reads as a
               hole in it. */
            className="btn border-royal-blue bg-royal-blue font-bold text-white hover:border-royal-blue/90 hover:bg-royal-blue/90 disabled:border-transparent disabled:bg-dark-teal/25 disabled:text-white/60"
          >
            Next
            <FaArrowRight aria-hidden className="size-4" />
          </button>
        </div>
      </Card>
    </>
  );
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <section className="rounded-box bg-base-100 px-6 py-7 shadow-sm ring-1 ring-dark-teal/5 sm:px-8">
    {children}
  </section>
);

const BackLink = ({ href }: { href: string }) => (
  <Link
    href={href}
    className="btn mt-6 border-royal-blue bg-transparent font-bold text-royal-blue shadow-none hover:bg-royal-blue hover:text-white"
  >
    <FaArrowLeft aria-hidden className="size-4" />
    Back to the jam
  </Link>
);
