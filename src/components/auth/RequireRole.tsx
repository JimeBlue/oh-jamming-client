'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { HOME_BY_ROLE } from '@/config/navigation';
import { useAuth } from '@/context/AuthContext';
import { safeNextPath } from '@/lib/nextPath';
import type { UserRole } from '@/schemas/user';

/* The client-side gate on venue-only and musician-only pages.

   Worth being clear about what this is and isn't: it is *not* the security
   boundary. The API checks the session cookie and the role on every write, and
   will 401 or 403 regardless of what this renders — `POST /jam-sessions` runs
   `authenticate` before `requireRole('venue')` precisely so the two answers
   stay distinguishable. This exists so nobody walks into that wall without
   understanding why. */

type RequireRoleProps = {
  role: UserRole;
  /* Where a wrong-role visitor should resume once they hold the right kind of
     account — not necessarily this page.

     Only the booking step passes it, and only because the page a venue lands on
     is a step *into* a flow rather than the start of one: dropped straight onto
     the instrument picker, a musician who just signed in has no idea which slot
     is being booked. Sending them to the session with `?slot=` instead shows
     them the choice and lets them press Next themselves, which is the same call
     JamSlotPicker's anonymous gate makes for the same reason.

     Defaults to this page, which is right wherever the page is a destination in
     itself — /my-bookings has nothing better to offer. */
  returnTo?: string;
  children: React.ReactNode;
};

/* Keyed by the role the page *requires*, not the one the visitor has — there
   are only two, so "you need to be a venue" already says "you are a musician".
   Reads better than assembling the sentence from both halves. */
const wrongRoleCopy: Record<
  UserRole,
  { heading: string; body: string; switchLabel: string }
> = {
  venue: {
    heading: 'This page is for venue accounts',
    body: 'Only venues can post jam sessions. Your account is registered as a musician.',
    switchLabel: 'Log in or register as a venue',
  },
  musician: {
    heading: 'This page is for musician accounts',
    body: 'Only musicians can book spots, and your account is registered as a venue. Log in with a musician account — or register one — to carry on.',
    switchLabel: 'Log in or register as a musician',
  },
};

/* Neither body ends on "browsing sessions is your side of the app" any more.
   That sentence was there to leave someone with somewhere to go, and it did it
   by closing the door — which is the opposite of what the button under it now
   offers. */

/* This page as a `next` value — query string and all, because of
   /jams/[id]/book?slot=…: the slot is the one thing the visitor chose before
   being asked to log in, and dropping it sends them back with nothing selected.

   Read off `window` rather than through `useSearchParams`: that hook opts the
   whole subtree out of static rendering, and this component wraps pages that
   are prerendered today. Both callers are client-only — an effect and a click
   handler — so there is no server pass to disagree with. */
const currentPathAndSearch = () => {
  const { pathname, search } = window.location;

  return `${pathname}${search}`;
};

const loginHref = (next: string) => `/login?next=${encodeURIComponent(next)}`;

const AuthPending = ({ label }: { label: string }) => (
  <div className="flex min-h-[60vh] items-center justify-center px-4">
    <span className="loading loading-spinner loading-lg text-primary" />
    <span className="sr-only">{label}</span>
  </div>
);

export default function RequireRole({
  role,
  returnTo,
  children,
}: RequireRoleProps) {
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  /* Set by the switch button just before it signs the user out, and read by the
     effect below to stand down.

     Without it the two of them fight over the same redirect. The button calls
     router.replace and then logout(); when logout lands, the auth state turns
     `anonymous` — and if the new route hasn't committed yet, this component is
     still mounted, so the effect fires, reads a window.location that is still
     the old page, and replaces the button's carefully built destination with
     this one. Whether it wins is a race between a navigation and a network
     request, which is why it looked like registering behaved differently from
     logging in: same code, different loser.

     A ref rather than state because it must take hold immediately, and nothing
     should re-render on account of it. It doesn't need resetting — the page is
     already on its way out, and a remount starts from false. */
  const switchingAccount = useRef(false);

  /* In an effect rather than during render: navigating is a side effect, and
     calling router.replace while rendering warns and can loop.

     `next` is how the user gets back here after logging in instead of being
     dropped on their role's home page — they clicked something specific, and
     that intent is worth keeping. Encoded, and re-checked on the way out in
     lib/nextPath, so it can't be turned into a redirect off-site.

     This page, deliberately, rather than `returnTo`: an anonymous visitor here
     opened the URL directly — JamSlotPicker catches the ones who came through
     the slot board before they ever reach the guard — so there is no earlier
     step of theirs to return them to. */
  useEffect(() => {
    if (status !== 'anonymous' || switchingAccount.current) return;

    router.replace(loginHref(currentPathAndSearch()));
  }, [status, pathname, router]);

  /* Both states render the same thing, for different reasons: `loading` is
     waiting on /auth/me, `anonymous` is waiting on the redirect above to land.

     Rendering the page during `loading` and correcting afterwards is the bug
     this prevents. A logged-in venue hard-refreshing /jams/new is `anonymous`
     for a moment before the answer arrives — treat that moment as "logged out"
     and they get bounced to the login page every single reload. */
  if (status === 'loading') {
    return <AuthPending label="Checking your session" />;
  }

  if (status === 'anonymous') {
    return <AuthPending label="Redirecting you to the login page" />;
  }

  /* A 404 would be the easier answer and the wrong one — it says "there is
     nothing here", which isn't true and gives them nothing to do next. They
     aren't lost, they're holding the other kind of account. */
  if (user.role !== role) {
    const { heading, body, switchLabel } = wrongRoleCopy[role];

    /* Sign out and go to the login page, so they can arrive back with the kind
       of account this page needs.

       Leave the page *before* clearing the session, the same order
       AccountMenu's logout uses — and see `switchingAccount` above for what
       stops the redirect effect from undoing it on the way.

       Where they land afterwards is the one thing the two sides don't share:

       - A venue turned away from the booking step was mid-flow, so `returnTo`
         carries them back to the slot they picked. AccountMenu deliberately
         drops `next` on logout, because a destination belonging to the account
         that just left is a trap; this is the exception, since the page is
         musician-only and musician is the role they are leaving to go and get.

       - A musician turned away from the builder wasn't mid-anything —
         /jams/new is a place, not a step — so there is nothing to return to and
         no `next` to carry. /login with none sends them home, which is where a
         new venue should start anyway: their board is empty until they publish
         something. */
    const switchAccount = () => {
      /* `returnTo` is assembled from route params by the page that passes it,
         so it is checked here as well — the same rule lib/nextPath applies to
         anything that reaches ?next=, since that is exactly where this is
         about to end up. */
      const destination =
        role === 'musician' ? safeNextPath(returnTo, currentPathAndSearch()) : null;

      /* Before either of the next two lines: the effect must be stood down
         while this component can still re-render, not after logout wakes it. */
      switchingAccount.current = true;

      router.replace(destination ? loginHref(destination) : '/login');

      /* Local state is cleared whether or not the request lands (see
         AuthContext), so a failure here still leaves the UI correct. */
      void logout().catch((error: unknown) => {
        console.error('Logout request failed:', error);
      });
    };

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-box border border-secondary bg-base-100 p-8 text-center shadow-xl">
          <h1 className="font-heading text-2xl">{heading}</h1>
          <p className="mt-3 text-sm opacity-80">{body}</p>

          {/* The account that can use this page is the answer to why they are
              reading this, so it leads on both sides. */}
          <button
            type="button"
            onClick={switchAccount}
            className="btn btn-secondary mt-6 w-full font-bold"
          >
            {switchLabel}
          </button>

          {/* Offered to a musician only, and only as the quieter of the two.

              A venue reached this card by picking a slot and pressing Next —
              they were mid-booking, and "here is your home page" answers a
              question they didn't ask. A musician clicking "Post your jam" out
              of curiosity is a likelier story than one who wants a second
              account for it, so the way back matters on this side.

              The header's navy rather than a second pink button: it is the same
              weight without competing for the same eye, and daisyUI's own
              secondary treatments both fail here — ghost has no edge on white,
              and outline reads as the pink one disabled. Written out rather than
              using a btn-* class for the same reason NavActions does: the hover
              swaps to royal blue, the other half of the header's pair, where
              daisyUI would grey it. */}
          {role === 'venue' && (
            <Link
              href={HOME_BY_ROLE[user.role]}
              className="btn mt-3 w-full border-brand-navy bg-brand-navy font-bold text-white shadow-none transition-colors hover:border-royal-blue hover:bg-royal-blue hover:text-white"
            >
              Take me to my home page
            </Link>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
