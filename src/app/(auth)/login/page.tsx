import type { Metadata } from 'next';

import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Log in · Oh Jamming',
};

export default function LoginPage() {
  return (
    /* relative so the card stacks above the layout's background and scrim —
       they're siblings, and without it the photo covers the form. */
    <div className="relative w-full max-w-md rounded-box bg-base-100 p-8 text-base-content shadow-2xl">
      <LoginForm />
    </div>
  );
}
