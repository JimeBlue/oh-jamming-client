'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import type { Booking } from '@/schemas/booking';
import type { JamSession } from '@/schemas/jamSession';
import { ApiError } from '@/services/api';
import { getJamSessionBookings } from '@/services/bookings';
import { getJamSession } from '@/services/jamSessions';
import { JamDetailProvider } from './JamDetailContext';
import JamDetailHeader from './JamDetailHeader';
import JamDetailNav from './JamDetailNav';

/* Everything the three panels share: the rail, the session card, and the two
   requests behind both.

   Client, and not by preference — the session is an httpOnly cookie on the API's
   domain, so nothing rendered on this server can read it and every authenticated
   request has to happen in the browser. The route's `layout.tsx` stays a server
   component around this one purely so it can still export `metadata`. */

/* Three states, the same shape as BackstageBoard and AuthContext, and for the
   same reason: "loaded and empty" and "not asked yet" are different answers, and
   a page that collapses them shows its empty state for a beat on every load. */
type DetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; session: JamSession; bookings: Booking[] };

const asMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

const Notice = ({ title, body }: { title: string; body: string }) => (
  <div
    role="alert"
    className="rounded-box border border-error/40 bg-error/5 p-6 text-center"
  >
    <p className="font-bold">{title}</p>
    <p className="mt-1 text-sm opacity-80">{body}</p>
    <Link href="/my-backstage" className="btn btn-primary mt-6 font-bold">
      Back to my backstage
    </Link>
  </div>
);

export default function JamDetailShell({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { status: authStatus, user } = useAuth();
  const [state, setState] = useState<DetailState>({ status: 'loading' });

  useEffect(() => {
    /* Flipped by the cleanup below, so a venue who clicks away mid-flight
       doesn't get a setState on an unmounted component. */
    let active = true;

    /* Both at once. They are independent — the session is public, the bookings
       are scoped to the caller — and running them in series would put one
       round-trip in front of the other for no reason.

       All-or-nothing rather than two states, which does mean a bookings failure
       hides a listing that would have rendered. Worth it: the two calls share a
       host, a cookie and a refresh, so the case where exactly one fails is
       narrow, and the alternative is every panel branching on which half of its
       data arrived. */
    Promise.all([getJamSession(id), getJamSessionBookings(id)])
      .then(([session, bookings]) => {
        if (active) setState({ status: 'ready', session, bookings });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: asMessage(error) });
      });

    return () => {
      active = false;
    };
  }, [id]);

  /* RequireRole in the layout above only renders children once /auth/me has
     answered and the account is a venue, so this is really always the id — the
     check is what narrows `User | null` for TypeScript. */
  const viewerId = authStatus === 'authenticated' ? user.id : null;

  /* `GET /jam-sessions/:id` is public, so a venue holding another venue's id
     gets a session back rather than a 403. Nothing is leaked by that — the
     browse hands the same document to anyone — but this page is a management
     screen, and its cockpit would be empty and its guest list blank while
     looking like a report about somebody's night. Better to say so.

     Not a security check. The API is: the bookings above already came back empty
     for a session that isn't this venue's, and every write is refused there. */
  const notMine =
    state.status === 'ready' && viewerId !== null && state.session.venueId !== viewerId;

  return (
    /* The rail has to reach the bottom of the window even when the panel beside
       it is short, and it can only do that against a definite height — `h-full`
       here would resolve against an auto-height parent and collapse to the
       content. 5rem is the builder header above it (`h-20`), and `dvh` rather
       than `vh` so a phone's collapsing address bar doesn't leave a strip of page
       background under the rail. */
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col lg:flex-row">
      <JamDetailNav id={id} />

      <div className="min-w-0 flex-1">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          {state.status === 'loading' && (
            <div className="flex justify-center py-24">
              <span className="loading loading-spinner loading-lg text-primary" />
              <span className="sr-only">Loading this jam session</span>
            </div>
          )}

          {state.status === 'error' && (
            <Notice title="This jam session couldn't be loaded" body={state.message} />
          )}

          {state.status === 'ready' &&
            (notMine ? (
              <Notice
                title="This jam session belongs to another venue"
                body="You can only manage the nights posted from your own account."
              />
            ) : (
              <>
                <JamDetailHeader session={state.session} />

                <JamDetailProvider
                  value={{ session: state.session, bookings: state.bookings }}
                >
                  {children}
                </JamDetailProvider>
              </>
            ))}
        </div>
      </div>
    </div>
  );
}
