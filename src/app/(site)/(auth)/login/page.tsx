import type { Metadata } from 'next';
import { Suspense } from 'react';

import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Log in · Oh Jamming',
};

export default function LoginPage() {
  return (
    /* relative so the card stacks above the layout's background and scrim —
       they're siblings, and without it the photo covers the form. */
    <div className="relative w-full max-w-md rounded-box bg-base-100 p-8 text-base-content shadow-2xl">
      {/* The form reads ?next= with useSearchParams, and this page is otherwise
          static. Without a boundary Next has to client-render everything above
          it too; with one, only the form waits. The fallback matches the card's
          height closely enough that nothing jumps when it swaps in. */}
      <Suspense
        fallback={
          <div className="grid min-h-96 place-items-center">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
