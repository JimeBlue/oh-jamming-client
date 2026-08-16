'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaArrowLeft, FaCheck } from 'react-icons/fa6';

import { useAuth } from '@/context/AuthContext';
import { formatListingDate } from '@/lib/jamListing';
import { utcMidnightToDateString } from '@/lib/time';
import type { JamSession } from '@/schemas/jamSession';
import { ApiError } from '@/services/api';
import { createBooking } from '@/services/bookings';
import { getJamSession } from '@/services/jamSessions';

/* Step three: what you are about to book, and the button that books it.

   Everything here is a re-reading of choices already made — nothing new is
   collected. The contact details come from the account and are shown disabled
   rather than left out, because "who is this booking for?" is a question worth
   answering on the page that commits, and because a musician who spots the wrong
   address should find out here rather than after the QR code. Editing them is a
   profile job, which is a different page and a different request. */

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

/* Disabled rather than readOnly. Both stop the typing; disabled also drops the
   field from any form submission and takes it out of the tab order, which is
   right for a value this page never sends — the API reads the musician off the
   session cookie. */
const ContactField = ({ label, value }: { label: string; value: string }) => (
  <fieldset className="fieldset">
    <legend className="fieldset-legend">{label}</legend>
    <input type="text" value={value} disabled className="input w-full" />
  </fieldset>
);

export default function BookingSummary({
  id,
  slotId,
  spotIds,
}: {
  id: string;
  slotId: string;
  spotIds: string[];
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

  const backHref = `/jams/${id}/book?slot=${encodeURIComponent(slotId)}`;

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
      /* Only ids. The labels and times on this page came from the session and go
         back as nothing — the API copies them off the spot itself at claim time,
         which is what keeps a booking's wording identical to the venue's. */
      const [booking] = await createBooking({
        jamSessionId: id,
        slotId,
        spotIds: chosen.map((spot) => spot.spotId),
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
      <h1 className="font-heading text-2xl">Booking summary</h1>

      <h2 className="mt-6 font-heading text-lg">Contact information</h2>

      {authStatus === 'authenticated' && (
        <div className="mt-1 grid gap-x-4 sm:grid-cols-2">
          <ContactField label="First name" value={user.firstName} />
          <ContactField label="Last name" value={user.lastName} />
          <div className="sm:col-span-2">
            <ContactField label="Email address" value={user.email} />
          </div>
        </div>
      )}

      <h2 className="mt-8 font-heading text-lg">Your booking</h2>

      <p className="mt-1 text-sm">
        <span className="font-bold tabular-nums">
          {slot.startTime} – {slot.endTime}
        </span>
        <span className="block opacity-70">
          {formatListingDate(utcMidnightToDateString(state.session.date))}
        </span>
      </p>

      {/* The labels only. Every other fact about these spots — the time, the day,
          who they are for — is already on this page, and repeating it per row
          would bury the one thing that differs. */}
      <ul className="mt-4 flex flex-wrap gap-2">
        {chosen.map((spot) => (
          <li
            key={spot.spotId}
            className="rounded-field border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary"
          >
            {spot.label}
          </li>
        ))}
      </ul>

      {submitError && (
        <div role="alert" className="mt-6 rounded-box border border-error/40 bg-error/5 p-4">
          <p className="text-sm font-bold">{submitError}</p>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
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
