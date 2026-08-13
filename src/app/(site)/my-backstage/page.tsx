import type { Metadata } from 'next';

import RequireRole from '@/components/auth/RequireRole';
import BackstageBoard from '@/components/backstage/BackstageBoard';

export const metadata: Metadata = {
  title: 'My Backstage · Oh Jamming',
};

/* A server component wrapping a client one, which is the only arrangement that
   gets both halves of this page: `metadata` is a server export, and the board
   itself cannot be anything but client — the session lives in an httpOnly cookie
   on the API's domain, so nothing rendered here can read it and every call for a
   venue's own sessions has to happen in the browser. */
export default function MyBackstagePage() {
  return (
    <RequireRole role="venue">
      {/* pt-28 clears the fixed site header. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <BackstageBoard />
      </main>
    </RequireRole>
  );
}
