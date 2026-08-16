'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { HOME_BY_ROLE } from '@/config/navigation';
import { useAuth } from '@/context/AuthContext';
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
    body: 'Only musicians can book spots. Your account is registered as a venue, so posting sessions and managing them is your side of the app.',
  },
};

const AuthPending = ({ label }: { label: string }) => (
  <div className="flex min-h-[60vh] items-center justify-center px-4">
    <span className="loading loading-spinner loading-lg text-primary" />
    <span className="sr-only">{label}</span>
  </div>
);

export default function RequireRole({ role, children }: RequireRoleProps) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  /* In an effect rather than during render: navigating is a side effect, and
     calling router.replace while rendering warns and can loop.

     `next` is how the user gets back here after logging in instead of being
     dropped on their role's home page — they clicked something specific, and
     that intent is worth keeping. Encoded, and re-checked on the way out in
     lib/nextPath, so it can't be turned into a redirect off-site. */
  useEffect(() => {
    if (status !== 'anonymous') return;

    /* The query string as well as the path, and read off `window` rather than
       through `useSearchParams` — that hook opts the whole subtree out of static
       rendering, and this component wraps pages that are prerendered today.
       Inside an effect there is no server pass to disagree with.

       It matters because of /jams/[id]/book?slot=…: the slot is the one thing a
       musician chose before being asked to log in, and dropping it sends them
       back to a booking page with nothing selected. */
    const { pathname: path, search } = window.location;

    router.replace(`/login?next=${encodeURIComponent(`${path}${search}`)}`);
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

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-box border border-secondary bg-base-100 p-8 text-center shadow-xl">
          <h1 className="font-heading text-2xl">{heading}</h1>
          <p className="mt-3 text-sm opacity-80">{body}</p>

          <Link
            href={HOME_BY_ROLE[user.role]}
            className="btn btn-secondary mt-6 w-full font-bold"
          >
            Take me to my home page
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
