import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import RegisterForm from '@/components/auth/RegisterForm';
import RoleTabs from '@/components/auth/RoleTabs';
import { userRoles, type UserRole } from '@/schemas/user';

/* Only two roles exist, so both pages are built ahead of time. With
   dynamicParams off, anything else — /register/banana — 404s at the router
   before this file runs. */
export const dynamicParams = false;

export function generateStaticParams() {
  return userRoles.map((role) => ({ role }));
}

const isUserRole = (value: string): value is UserRole =>
  (userRoles as readonly string[]).includes(value);

type RegisterPageProps = {
  params: Promise<{ role: string }>;
};

export async function generateMetadata({
  params,
}: RegisterPageProps): Promise<Metadata> {
  const { role } = await params;

  return {
    title: isUserRole(role)
      ? `Register as a ${role} · Oh Jamming`
      : 'Register · Oh Jamming',
  };
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { role } = await params;

  /* dynamicParams already blocks unknown values; this narrows string to
     UserRole for the components below, and holds the line if that config ever
     changes. */
  if (!isUserRole(role)) notFound();

  return (
    /* relative so the card stacks above the layout's background and scrim. */
    <div className="relative w-full max-w-md">
      <RoleTabs activeRole={role} />

      {/* Square top corners so the card reads as the panel the tabs are
          attached to, whichever of the two is active. */}
      <div className="rounded-box rounded-t-none bg-base-100 p-8 text-base-content shadow-2xl">
        <RegisterForm role={role} />
      </div>
    </div>
  );
}
