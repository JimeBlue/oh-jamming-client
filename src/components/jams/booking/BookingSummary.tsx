'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa6';
import { IoTicketSharp } from 'react-icons/io5';

import { useAuth } from '@/context/AuthContext';
import { cityFromAddress, formatListingDate } from '@/lib/jamListing';
import { utcMidnightToDateString } from '@/lib/time';
import type { JamSession } from '@/schemas/jamSession';
import { ApiError } from '@/services/api';
import { createBooking } from '@/services/bookings';
import { getJamSession } from '@/services/jamSessions';

/* Step three: what you are about to book, and the button that books it.

   Everything here is a re-reading of choices already made — nothing new is
   collected, and nothing is a form control. The contact details come from the
   account and are shown rather than left out, because "who is this booking for?"
   is a question worth answering on the page that commits, and because a musician
   who spots the wrong address should find out here rather than after the QR
   code. Editing them is a profile job, which is a different page and a different
   request.

   The same three grounds as the instrument step, doing the same three jobs:
   royal blue for what is being asked, cyan for the part of the booking that is
   the musician's own choice, white for the facts and the two ways out. What
   moved between the two steps is the shape of the middle block — there it is a
   grid to pick from, here it is a list to check. */

type SummaryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; session: JamSession };

const asMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

const Card = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    className={`rounded-box bg-base-100 px-6 py-7 shadow-sm ring-1 ring-dark-teal/5 sm:px-8 ${className}`}
  >
    {children}
  </section>
);

/* The small uppercase line every block and every fact opens with — the same
   device the instrument step uses, and the only thing carrying the label now
   that the icons are gone. The design has none: on a page of eight short
   labels they were eight marks competing with the words that say what the
   value is. */
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

/* A labelled fact, not a field. Nothing on this page is editable, and disabled
   inputs said "you could have typed here" about values that come off the account
   and the step before.

   `className` carries the rules between them rather than a `divide-*` on the
   grid: the four sit in one column on a phone and two on a desktop, and a
   divider that is right in one of those is wrong in the other. */
const Fact = ({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={className}>
    <Eyebrow className="text-royal-blue">{label}</Eyebrow>
    <div className="mt-1.5 text-lg font-bold text-dark-teal">{children}</div>
  </div>
);

export default function BookingSummary({
  id,
  slotId,
  spotIds,
  bandName,
}: {
  id: string;
  slotId: string;
  spotIds: string[];
  /* Already trimmed by the page, and "" for a booking with no band. Typed on the
     instrument step, not here — this page collects nothing. */
  bandName: string;
}) {
  const router = useRouter();
  const { status: authStatus, user } = useAuth();

  const [state, setState] = useState<SummaryState>({ status: 'loading' });
  const [submitting, setSubmitting] = useState(false);

  /* Kept apart from the load failure above: this one leaves the page usable and
     the spots still chosen, and the most likely cause — someone else took one of
     them — is fixed by going back a step rather than by retrying. */
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  /* The spots and the band name go back with it. Without them Back is a reset
     button wearing a Back label — the step reopens empty and the musician
     re-types what they had just finished choosing. */
  const backHref =
    `/jams/${id}/book?slot=${encodeURIComponent(slotId)}&spots=${spotIds
      .map(encodeURIComponent)
      .join(',')}` + (bandName ? `&band=${encodeURIComponent(bandName)}` : '');

  if (state.status === 'loading' || authStatus === 'loading') {
    return (
      <Card>
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-royal-blue" />
          <span className="sr-only">Loading your booking</span>
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

  /* The spots as the venue named them, in the order they appear in the slot
     rather than the order they were clicked — the same order the step before
     showed them in, so the two lists read as the same list. Anything in the URL
     that isn't a real spot on this slot simply doesn't appear. */
  const chosen = slot?.spots.filter((spot) => spotIds.includes(spot.spotId)) ?? [];

  if (!slot || chosen.length === 0) {
    return (
      <Card>
        <h1 className="font-display text-2xl font-bold text-dark-teal">
          This booking is no longer valid
        </h1>
        <p className="mt-3 text-sm text-dark-teal/80">
          The session may have been edited since you started. Pick your slot again.
        </p>
        <BackLink href={`/jams/${id}`} />
      </Card>
    );
  }

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      /* Only ids, plus the name. The labels and times on this page came from the
         session and go back as nothing — the API copies them off the spot itself
         at claim time, which is what keeps a booking's wording identical to the
         venue's.

         `bandName` is spread in rather than sent as '': the payload is a
         strictObject mirroring the API's, and an empty string fails its `min(2)`,
         which would be a 400 for the whole submission. Absent is the way to say
         "no band name". */
      const [booking] = await createBooking({
        jamSessionId: id,
        slotId,
        spotIds: chosen.map((spot) => spot.spotId),
        ...(bandName ? { bandName } : {}),
      });

      /* Every row of the response shares one groupId, and that is the booking as
         a musician understands it — one submission, one confirmation, one QR. */
      router.replace(`/jams/${id}/book/confirmed?group=${encodeURIComponent(booking.groupId)}`);
    } catch (error) {
      /* The API's wording, verbatim, and no branch on 409 — it says more than
         this page can work out and it already says what to do.

         Three different conflicts reach here: a spot claimed while the summary
         was open ("The First Guitar spot at 20:00 is no longer available. Please
         choose another" — only the server knows *which* one went), a session
         cancelled underneath the booking, and a slot that has already started.
         One replacement sentence would have to serve all three, and the two that
         aren't about a taken spot are not fixed by picking a different
         instrument. */
      setSubmitError(asMessage(error));
      setSubmitting(false);
    }
  };

  /* The city, falling back to the venue's name alone when the address line has
     no postcode to read one off — the same call `JamCard` makes, so the town a
     musician picked the night by is the town this page names it with. */
  const city = cityFromAddress(state.session.address.formatted);

  return (
    <>
      <section className="rounded-box bg-royal-blue px-6 py-7 text-white sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="lg:max-w-lg">
            <Eyebrow className="text-white/70">Open jam</Eyebrow>

            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              Booking summary
            </h1>

            {/* The whole reason a summary step exists, said in one line: nothing
                below this has happened yet. */}
            <p className="mt-3 text-white/85">
              Check the details below. Nothing is reserved until you confirm.
            </p>
          </div>

          {/* Who the booking is for, in a panel of the same blue lightened —
              the same device the instrument step's date panel is, in the same
              corner, so the two steps put "the thing you already settled" in one
              place. The initials stand in for an avatar the account doesn't
              have; they are decoration beside the name they are drawn from, so
              nothing is lost by hiding them from a screen reader. */}
          {authStatus === 'authenticated' && (
            <div className="flex w-fit shrink-0 items-center gap-3 rounded-box bg-white/15 px-4 py-3">
              <span
                aria-hidden
                className="grid size-11 shrink-0 place-items-center rounded-field bg-base-100 font-display font-bold text-royal-blue"
              >
                {`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`}
              </span>
              <div className="min-w-0">
                <p className="font-bold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-sm text-white/70">{user.email}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* The facts and the spots side by side from `lg`, stacked below it — and
          the spots come first in the source so a phone meets them first. What a
          musician wants confirmed on a small screen is which instruments they
          just claimed; the date and the venue are the things they already knew
          when they picked the night. */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cyan, because these are the choices made two steps ago and cyan is
            what that block was — the colour is the link back to where they were
            picked. */}
        <section
          aria-labelledby="spots-heading"
          className="order-1 rounded-box bg-cyan-blue px-6 py-6 lg:order-2 lg:col-span-1"
        >
          <Eyebrow className="text-white">
            <span id="spots-heading">Spots you booked</span>
          </Eyebrow>

          {/* The labels only. Every other fact about these spots — the time, the
              day, who they are for — is already on this page, and repeating it
              per row would bury the one thing that differs.

              The same white tile the instrument step's pills are, unpicked: it
              is the same object, one step on, and now with nothing to click. */}
          <ul className="mt-4 space-y-3">
            {chosen.map((spot) => (
              <li
                key={spot.spotId}
                className="rounded-field bg-base-100 px-5 py-3 font-bold text-dark-teal"
              >
                {spot.label}
              </li>
            ))}
          </ul>
        </section>

        <Card className="order-2 lg:order-1 lg:col-span-2">
          {/* Two by two from `sm`, one column below it. The rules run between
              rows rather than around each fact — four boxed values read as four
              things to do something about, and there is nothing to do here.

              Written as two rows rather than one four-cell grid, and that is
              what makes the rule continuous: a border on each cell stops at the
              column gap, leaving a line with a notch cut out of it. Below `sm`
              the rows collapse and the borders move back onto the cells, because
              in one column every fact is its own row. */}
          <div className="grid gap-x-10 sm:grid-cols-2 sm:border-b sm:border-dark-teal/10 sm:pb-5">
            <Fact
              label="Date"
              className="border-b border-dark-teal/10 pb-5 sm:border-b-0 sm:pb-0"
            >
              {formatListingDate(utcMidnightToDateString(state.session.date))}
            </Fact>

            <Fact
              label="Time slot"
              className="border-b border-dark-teal/10 py-5 sm:border-b-0 sm:py-0"
            >
              <span className="tabular-nums">
                {slot.startTime} – {slot.endTime}
              </span>
            </Fact>
          </div>

          <div className="grid gap-x-10 pt-5 sm:grid-cols-2">
            {/* The venue is the reason the band name is here at all: its guest
                list already has a Band column, and without a name three spots
                held by one account look like a mistake rather than a group.
                Stated either way, because "nothing here" and "we forgot to show
                it" look identical when the row is simply absent — and this is
                the last screen before the name is committed. */}
            <Fact
              label="Band name"
              className="border-b border-dark-teal/10 pb-5 sm:border-b-0 sm:pb-0"
            >
              <span className={bandName ? '' : 'font-normal text-dark-teal/50'}>
                {bandName || 'No band name provided'}
              </span>
            </Fact>

            <Fact label="Venue" className="pt-5 sm:pt-0">
              {city ? `${city} · ${state.session.venueName}` : state.session.venueName}
            </Fact>
          </div>
        </Card>
      </div>

      {submitError && (
        <div
          role="alert"
          className="rounded-box border border-error/40 bg-error/5 px-5 py-4"
        >
          <p className="text-sm font-bold">{submitError}</p>
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="btn border-royal-blue bg-transparent font-bold text-royal-blue shadow-none hover:bg-royal-blue hover:text-white"
          >
            <FaArrowLeft aria-hidden className="size-4" />
            Back
          </Link>

          {/* Disabled while the request is out, and it has to be: a second click
              is a second submission with a second groupId, and the spots claimed
              by the first would make it fail — a musician double-clicking would
              see "that spot was just taken" about a spot they had just been
              given.

              The disabled treatment is the one both steps before it wear, rather
              than daisyUI's grey fill, and so is the outline it empties out to
              on hover — the border is there at rest in the fill's own colour so
              gaining a visible edge doesn't change the button's height. */}
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="btn border-royal-blue bg-royal-blue font-bold text-white transition-colors hover:bg-transparent hover:text-royal-blue disabled:border-transparent disabled:bg-dark-teal/25 disabled:text-white/60"
          >
            {submitting && <span className="loading loading-spinner" />}
            {submitting ? 'Booking…' : 'Confirm booking'}
            {!submitting && <IoTicketSharp aria-hidden className="size-5" />}
          </button>
        </div>
      </Card>
    </>
  );
}

const BackLink = ({ href }: { href: string }) => (
  <Link
    href={href}
    className="btn mt-6 border-royal-blue bg-transparent font-bold text-royal-blue shadow-none hover:bg-royal-blue hover:text-white"
  >
    <FaArrowLeft aria-hidden className="size-4" />
    Back to the jam
  </Link>
);
