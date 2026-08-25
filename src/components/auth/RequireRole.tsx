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
const wrongRoleCopy: Record<UserRole, { heading: string; body: string }> = {
  venue: {
    heading: 'This page is for venue accounts',
    body: 'Only venues can post jam sessions. Your account is registered as a musician, so browsing sessions and booking spots is your side of the app.',
  },
  musician: {
    heading: 'This page is for musician accounts',
    /* Doesn't end on "posting sessions is your side of the app" the way the
       venue one does: that closes the door, and this side of the card now
       offers a way through it. */
    body: 'Only musicians can book spots, and your account is registered as a venue. Log in with a musician account — or register one — to carry on.',
  },
};

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
    const { heading, body } = wrongRoleCopy[role];

    /* Sign out and land on the login page, pointed at wherever they should pick
       the flow back up. Only offered on the musician side — see the button
       below.

       Leave the page *before* clearing the session, the same order
       AccountMenu's logout uses. There it prevents the guard from capturing a
       `next`; here the guard would build the identical URL, so what this
       actually buys is not flashing the "Redirecting you…" spinner on the way.

       Unlike that one, this *wants* the `next`. AccountMenu drops it because a
       destination belonging to the account that just left is a trap — log back
       in as the other role and you are greeted by this very card. Here the
       destination is musician-only and musician is the role they are leaving to
       go and get, so it is the one case where the two agree. */
    const switchToMusician = () => {
      /* `returnTo` is assembled from route params by the page that passes it,
         so it is checked here as well — the same rule lib/nextPath applies to
         anything that reaches ?next=, since that is exactly where this is
         about to end up. */
      const destination = safeNextPath(returnTo, currentPathAndSearch());

      /* Before either of the next two lines: the effect must be stood down
         while this component can still re-render, not after logout wakes it. */
      switchingAccount.current = true;

      router.replace(loginHref(destination));

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

          {/* Two different dead ends, so two different ways out.

              A venue turned away from a musician-only page got here by
              *reaching for something* — they picked a slot and pressed Next.
              "Take me to my home page" answers a question they didn't ask;
              what they need is the account that can finish the booking, and
              the slot is still in the URL to come back to.

              The other direction isn't the same shape. A musician on
              /jams/new or /my-backstage didn't pick anything to come back
              for — the builder is a place, not a step — so home stays the
              honest offer there until that side gets a flow of its own. */}
          {role === 'musician' ? (
            <button
              type="button"
              onClick={switchToMusician}
              className="btn btn-secondary mt-6 w-full font-bold"
            >
              Log in or register as a musician
            </button>
          ) : (
            <Link
              href={HOME_BY_ROLE[user.role]}
              className="btn btn-secondary mt-6 w-full font-bold"
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
