'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaArrowLeft, FaCheck, FaRegCalendar } from 'react-icons/fa6';
import { HiUserGroup } from 'react-icons/hi';
import { MdFactCheck } from 'react-icons/md';
import { RiTimerFlashLine } from 'react-icons/ri';
import { VscPreview } from 'react-icons/vsc';

import { useAuth } from '@/context/AuthContext';
import { formatListingDate } from '@/lib/jamListing';
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
   request. */

type SummaryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; session: JamSession };

const asMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

const Card = ({ children }: { children: React.ReactNode }) => (
  <section className="rounded-box bg-base-100 p-6 text-base-content shadow-lg sm:p-8">
    {children}
  </section>
);

/* A labelled fact, not a field. Nothing on this page is editable, and disabled
   inputs said "you could have typed here" about values that come off the account
   and the step before. The label carries the icon, the same way the section
   headings on the two steps before it do. */
const Fact = ({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
      {icon}
      {label}
    </p>
    <div className="mt-1.5">{children}</div>
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
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="sr-only">Loading your booking</span>
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
        <Link href={`/jams/${id}`} className="btn btn-outline btn-primary mt-6 font-bold">
          Back to the jam
        </Link>
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
        <h1 className="font-heading text-2xl">This booking is no longer valid</h1>
        <p className="mt-3 text-sm opacity-80">
          The session may have been edited since you started. Pick your slot again.
        </p>
        <Link href={`/jams/${id}`} className="btn btn-outline btn-primary mt-6 font-bold">
          Back to the jam
        </Link>
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

  return (
    <Card>
      {/* The same header the two steps before it wear: icon, then the title in
          Space Grotesk. */}
      <div className="flex items-start gap-3">
        <VscPreview
          aria-hidden
          className="size-7 shrink-0 text-primary sm:size-9"
        />
        <h1 className="font-display text-xl font-bold">Booking summary</h1>
      </div>

      {/* Who the booking is for, in a panel rather than in fields — see `Fact`.
          The initials stand in for an avatar the account doesn't have; they are
          decoration beside the name they are drawn from, so nothing is lost by
          hiding them from a screen reader. */}
      {authStatus === 'authenticated' && (
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-box border border-base-300 bg-base-200 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-11 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-content"
            >
              {`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`}
            </span>
            <div>
              <p className="font-bold">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-base-content/60">{user.email}</p>
            </div>
          </div>

          {/* The venue is the reason this exists: its guest list already has a
              Band column, and without a name three spots held by one account
              look like a mistake rather than a group. Stated either way, because
              "nothing here" and "we forgot to show it" look identical when the
              row is simply absent — and it is the last screen before the name
              is committed. */}
          <div className="sm:border-l sm:border-base-300 sm:pl-6">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
              <HiUserGroup aria-hidden className="size-4" />
              Band name
            </p>
            {/* A step down from the name above it: this is the one value on the
                panel that may say nothing at all, and at full size an absence
                carries as much weight as the booking. */}
            <p
              className={`mt-1.5 text-sm ${
                bandName ? 'font-bold' : 'text-base-content/60'
              }`}
            >
              {bandName || 'No band name provided'}
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Fact
          icon={<RiTimerFlashLine aria-hidden className="size-4" />}
          label="Time slot"
        >
          <p className="font-bold tabular-nums">
            {slot.startTime} – {slot.endTime}
          </p>
        </Fact>

        {/* The labels only. Every other fact about these spots — the time, the
            day, who they are for — is already on this page, and repeating it per
            row would bury the one thing that differs. */}
        <Fact icon={<MdFactCheck aria-hidden className="size-4" />} label="Spots">
          <ul className="flex flex-wrap gap-2">
            {chosen.map((spot) => (
              <li
                key={spot.spotId}
                className="rounded-field border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary"
              >
                {spot.label}
              </li>
            ))}
          </ul>
        </Fact>

        <Fact icon={<FaRegCalendar aria-hidden className="size-4" />} label="Date">
          <p>{formatListingDate(utcMidnightToDateString(state.session.date))}</p>
        </Fact>
      </div>

      {submitError && (
        <div role="alert" className="mt-6 rounded-box border border-error/40 bg-error/5 p-4">
          <p className="text-sm font-bold">{submitError}</p>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between gap-3 border-t border-base-200 pt-8">
        <Link href={backHref} className="btn btn-outline btn-primary font-bold">
          <FaArrowLeft aria-hidden className="size-4" />
          Back
        </Link>

        {/* Disabled while the request is out, and it has to be: a second click
            is a second submission with a second groupId, and the spots claimed
            by the first would make it fail — a musician double-clicking would
            see "that spot was just taken" about a spot they had just been
            given. */}
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="btn btn-primary font-bold"
        >
          {submitting ? (
            <span className="loading loading-spinner" />
          ) : (
            <FaCheck aria-hidden className="size-4" />
          )}
          {submitting ? 'Booking…' : 'Confirm booking'}
        </button>
      </div>
    </Card>
  );
}
