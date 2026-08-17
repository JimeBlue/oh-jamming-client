'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa6';

import JamSlotPicker from '@/components/jams/detail/JamSlotPicker';
import JamIntroCard from '@/components/jams/listing/JamIntroCard';
import { jamSessionToListing } from '@/lib/jamListing';
import type { JamListingView } from '@/lib/jamListing';
import { ApiError } from '@/services/api';
import { getJamSession } from '@/services/jamSessions';

/* The detail page, from the back link down to the Next button.

   Client, and not by preference: `GET /jam-sessions/:id` is public, so a server
   component could read it, but the slot click has to know whether the visitor is
   signed in — and that answer lives in an httpOnly cookie on the API's domain
   that nothing on this server can see.

   The fetch is here rather than in the two cards below because they draw the
   same session: the title above the box, the photo and genres inside it, the
   slots underneath. Two fetches would be two round-trips that can disagree about
   which session this is and, worse, fill the page in two stages. */

/* Three states, the same shape as `JamDetailShell` and `AuthContext`: "loaded
   and empty" and "not asked yet" are different answers, and collapsing them
   flashes the wrong one on every load. */
type DetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; listing: JamListingView; cancelled: boolean };

const asMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

export default function JamDetailView({
  id,
  initialSlotId,
}: {
  id: string;
  initialSlotId?: string;
}) {
  const [state, setState] = useState<DetailState>({ status: 'loading' });

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
    <>
      {/* Above everything and on the page's own ground, where the page's
          furniture lives. The link is first in the DOM as well as on screen:
          someone who lands here by mistake shouldn't have to tab past a whole
          listing to leave.

          Space Grotesk, like the night's name below it — Changa One has one
          weight and no lowercase, so set in caps at 14px it read as a third
          voice on a page that already has two. `tracking-wider` because caps
          are what letter-spacing exists for: the glyphs are all the same height
          and run together without it. */}
      <Link
        href="/jams"
        className="inline-flex w-fit items-center gap-2.5 font-display text-sm font-bold uppercase tracking-wider text-royal-blue transition-colors hover:text-cyan-blue"
      >
        <FaArrowLeft aria-hidden className="size-4" />
        Back to jams
      </Link>

      {state.status === 'loading' && (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg text-royal-blue" />
          <span className="sr-only">Loading this jam session</span>
        </div>
      )}

      {/* A tinted panel rather than `alert-error`: `--color-info` and friends are
          solid loud blocks in this theme, and one line of apology doesn't need
          to be shouted. */}
      {state.status === 'error' && (
        <p
          role="alert"
          className="rounded-box border border-royal-blue/30 bg-royal-blue/10 p-6 text-dark-teal"
        >
          {state.message}
        </p>
      )}

      {state.status === 'ready' && (
        <>
          <JamIntroCard listing={state.listing} cancelled={state.cancelled} />

          <JamSlotPicker
            id={id}
            listing={state.listing}
            cancelled={state.cancelled}
            initialSlotId={initialSlotId}
          />
        </>
      )}
    </>
  );
}
