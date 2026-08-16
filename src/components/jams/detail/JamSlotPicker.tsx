'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaArrowRight, FaRegCalendar } from 'react-icons/fa6';

import JamSlotList from '@/components/jams/listing/JamSlotList';
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

export default function JamSlotPicker({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<PickerState>({ status: 'loading' });

  /* Picking and continuing are two acts, and the button below is what separates
     them. A row that navigated on click would leave a musician on the next page
     with no way to see which slot they chose or to change their mind short of
     going back — worse for anyone sent through the login gate in between, since
     they meet that page after a detour.

     It stays local state: the moment they continue, the slot is in the URL, which
     is what lets the gate carry it and the back button undo it. */
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

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
                  slot straight back here.

                  Disabled by attribute rather than by a class: the attribute is
                  what takes it out of the tab order and stops the click, and
                  daisyUI dims it either way.

                  Continuing does not check whether anyone is signed in. That is
                  asked once, by the `RequireRole` on the booking route — a second
                  check in front of it would be a second answer to the same
                  question, and only one of them redirects. */}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={selectedSlotId === null}
                  onClick={() =>
                    router.push(
                      `/jams/${id}/book?slot=${encodeURIComponent(selectedSlotId ?? '')}`,
                    )
                  }
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
