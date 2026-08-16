'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa6';

import localScene from '@/assets/build-for-local-scene.png';
import JamIntroCard from '@/components/jams/detail/JamIntroCard';
import JamSlotPicker from '@/components/jams/detail/JamSlotPicker';
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
      {/* Above the card and on the indigo, where the page's own furniture lives.
          The link is first in the DOM as well as on screen: someone who lands
          here by mistake shouldn't have to tab past a whole listing to leave. */}
      <Link
        href="/jams"
        /* Space Grotesk, like the title it sits above — Changa One has one
           weight and no lowercase, so set in caps at 14px it read as a third
           voice on a page that already has two. `tracking-wider` because caps
           are what letter-spacing exists for: the glyphs are all the same
           height and run together without it. */
        className="inline-flex w-fit items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-primary-content transition-colors hover:text-brand-pink"
      >
        <FaArrowLeft aria-hidden className="size-4" />
        Back to jams
      </Link>

      {/* `items-end` so the sticker hangs off the bottom of the row rather than
          the top of it, whatever height the title wraps to. */}
      <div className="flex items-end justify-between gap-6">
        {/* The page's h1, so the cards below can keep starting at h2. Held at a
            fixed height while the title is still out, because the badge beside it
            would otherwise jump up the page when the name arrives. */}
        <h1 className="min-h-12 flex-1 font-display text-3xl font-bold text-primary-content sm:text-5xl">
          {state.status === 'ready' ? state.listing.title : ''}
        </h1>

        {/* Decorative, so `alt=""` rather than a description: it is the site's
            sticker, and reading "build for the local scene" out between the
            jam's name and its details tells a screen reader nothing about this
            night. Hidden on phones, where it would take a third of the screen
            above the fold.

            The negative margin is what makes it sit *on* the card rather than
            above it: it pulls the flex line up past the column's own gap, and
            the sticker overhangs into the box below. `relative` for the
            stacking context — without it the card, being later in the DOM,
            paints over the half that is meant to be on top of it. */}
        <Image
          src={localScene}
          alt=""
          priority
          className="relative z-10 -mb-16 hidden size-24 shrink-0 -rotate-12 sm:block lg:size-28"
        />
      </div>

      {state.status === 'loading' && (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg text-primary-content" />
          <span className="sr-only">Loading this jam session</span>
        </div>
      )}

      {/* On the indigo rather than inside an empty card: there is no listing to
          put a card around, and a white box holding one line of apology reads as
          a session with nothing in it. */}
      {state.status === 'error' && (
        <p
          role="alert"
          className="rounded-box border border-primary-content/30 bg-primary-content/10 p-6 text-primary-content"
        >
          {state.message}
        </p>
      )}

      {state.status === 'ready' && (
        <>
          <JamIntroCard listing={state.listing} />

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
