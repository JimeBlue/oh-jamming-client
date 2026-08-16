'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaArrowRight, FaRegCalendar } from 'react-icons/fa6';

import JamSlotList from '@/components/jams/listing/JamSlotList';
import { useAuth } from '@/context/AuthContext';
import { formatListingDate, jamSessionToListing } from '@/lib/jamListing';
import type { JamListingView } from '@/lib/jamListing';
import { ApiError } from '@/services/api';
import { getJamSession } from '@/services/jamSessions';

/* The slot picker, and the step where the booking flow actually starts.

   Client, and not by preference: `GET /jam-sessions/:id` is public, so a server
   component could read it, but the slot click has to know whether the visitor is
   signed in — and that answer lives in an httpOnly cookie on the API's domain
   that nothing on this server can see. One fetch in the browser rather than a
   server read plus a client one that disagree about which session this is.

   `JamSlotList` is the builder's own component, reused rather than rebuilt, and
   `jamSessionToListing` is the adapter it is fed through in the preview too. The
   availability on each row is counted there, off the spots with no booking on
   them — the model has no counter, so a second sum here would be a second answer
   waiting to disagree with the venue's. */

/* Three states, the same shape as `JamDetailShell` and `AuthContext`: "loaded
   and empty" and "not asked yet" are different answers, and collapsing them
   flashes the wrong one on every load. */
type PickerState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; listing: JamListingView; cancelled: boolean };

const asMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

export default function JamSlotPicker({
  id,
  initialSlotId,
}: {
  id: string;
  initialSlotId?: string;
}) {
  const router = useRouter();
  const { status: authStatus } = useAuth();
  const [state, setState] = useState<PickerState>({ status: 'loading' });

  /* Picking and continuing are two acts, and the button below is what separates
     them. A row that navigated on click would leave a musician on the next page
     with no way to see which slot they chose or to change their mind short of
     going back.

     Seeded from `?slot=` so a musician returning from the login gate finds their
     choice already made — they left this page mid-decision, and the point of
     sending them back here rather than onward is that they get to see it and
     press Next themselves. An id that matches no slot simply highlights nothing,
     which is the right answer for a hand-edited URL. */
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    initialSlotId ?? null,
  );

  /* Where Next goes, and the one place the login gate is decided for this flow.

     An anonymous musician is sent to /login with *this* page as the destination,
     slot and all — not the booking page. Landing back here is the whole point:
     they picked a time, got interrupted by a sign-in they didn't ask for, and
     the honest way to resume is to show them the choice they made and let them
     press Next themselves.

     `RequireRole` still guards the booking route, and still redirects to it
     rather than here. That is not the same check said twice: it catches someone
     opening /jams/x/book directly, where this page was never involved and there
     is nothing to come back to. */
  const continueToBooking = (slotId: string) => {
    const booking = `/jams/${id}/book?slot=${encodeURIComponent(slotId)}`;

    if (authStatus === 'anonymous') {
      const back = `/jams/${id}?slot=${encodeURIComponent(slotId)}`;

      router.push(`/login?next=${encodeURIComponent(back)}`);
      return;
    }

    router.push(booking);
  };

  useEffect(() => {
    /* Flipped by the cleanup, so navigating away mid-flight doesn't set state on
       an unmounted component. */
    let active = true;

    getJamSession(id)
      .then((session) => {
        if (active) {
          setState({
            status: 'ready',
            listing: jamSessionToListing(session),
            /* A cancelled night still resolves here — that is deliberate on the
               API's side, so a musician holding a booking finds out rather than
               meeting a 404. It must not be bookable, though, and the view model
               drops `status` on the way through, so it is read off the response
               before the adapter runs. */
            cancelled: session.status === 'cancelled',
          });
        }
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: asMessage(error) });
      });

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <section className="rounded-box bg-base-100 p-6 text-base-content shadow-lg sm:p-8">
      <h2 className="flex items-center gap-2 font-heading text-2xl">
        <FaRegCalendar aria-hidden className="size-5 text-brand-pink-deep" />
        Date &amp; time
      </h2>

      {state.status === 'loading' && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="sr-only">Loading this jam session</span>
        </div>
      )}

      {state.status === 'error' && (
        <p role="alert" className="mt-4 text-sm opacity-80">
          {state.message}
        </p>
      )}

      {state.status === 'ready' && (
        <>
          <p className="mt-4 text-sm">
            {formatListingDate(state.listing.date) ?? 'Date to be confirmed'}
            <span className="block tabular-nums opacity-70">
              {state.listing.startTime} – {state.listing.endTime}
            </span>
          </p>

          {state.cancelled ? (
            /* No slot list at all rather than a disabled one. Every row would say
               "Booked out", which is a different thing from the night being off
               and reads like the jam sold out. */
            <p className="mt-4 text-sm font-bold text-brand-pink-deep">
              This jam session has been cancelled.
            </p>
          ) : (
            <>
              <p className="mt-4 mb-3 text-sm font-bold">
                Select a time slot to book a spot
              </p>

              <JamSlotList
                slots={state.listing.slots}
                selectedSlotId={selectedSlotId}
                onSelect={setSelectedSlotId}
              />

              {/* Disabled until a slot is picked, because there is nothing to
                  continue to — the booking route sends anyone arriving without a
                  slot straight back here. Also while `/auth/me` is still out:
                  the branch below depends on the answer, and guessing sends half
                  of them to the wrong page.

                  Disabled by attribute rather than by a class: the attribute is
                  what takes it out of the tab order and stops the click, and
                  daisyUI dims it either way. */}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={selectedSlotId === null || authStatus === 'loading'}
                  onClick={() => continueToBooking(selectedSlotId ?? '')}
                  className="btn btn-primary font-bold"
                >
                  Next
                  <FaArrowRight aria-hidden className="size-4" />
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
