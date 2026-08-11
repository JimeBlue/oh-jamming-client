import type { Metadata } from 'next';
import Link from 'next/link';
import { FaPlugCirclePlus } from 'react-icons/fa6';

import RequireRole from '@/components/auth/RequireRole';

export const metadata: Metadata = {
  title: 'My Backstage · Oh Jamming',
};

/* A placeholder with a real address. It exists now because two things already
   need somewhere to land: the account menu's "My Backstage", and a venue
   finishing the jam builder. Both would otherwise point at a 404 or at `/`,
   and a link that goes to the wrong place is harder to spot later than an
   empty page that admits what it is. */
export default function MyBackstagePage() {
  return (
    <RequireRole role="venue">
      {/* pt-28 clears the fixed site header. */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl sm:text-4xl">My Backstage</h1>
        <p className="mt-2 opacity-70">
          Everything you&apos;ve put on: your jam sessions, who has booked which
          spot, and how full each night is.
        </p>

        <div className="mt-8 grid place-items-center rounded-box border border-dashed border-base-300 bg-base-100 p-10 text-center">
          <p className="text-sm opacity-60">
            This board is still to be built. Once it is, your sessions will be
            listed here.
          </p>

          <Link
            href="/jams/new"
            className="btn btn-secondary mt-6 gap-2 font-bold"
          >
            <FaPlugCirclePlus className="size-5" />
            Insert your Jam
          </Link>
        </div>
      </main>
    </RequireRole>
  );
}
