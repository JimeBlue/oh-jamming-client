'use client';

import Link from 'next/link';
import type { IconType } from 'react-icons/lib';
import {
  IoAddCircleOutline,
  IoLogOutOutline,
  IoMusicalNotesOutline,
  IoSpeedometerOutline,
  IoTicketOutline,
} from 'react-icons/io5';

import { useAuth } from '@/context/AuthContext';
import type { User, UserRole } from '@/schemas/user';

type AccountLink = {
  label: string;
  href: string;
  icon: IconType;
};

/* The two roles get different menus — a musician books spots, a venue puts jams
   up for booking. Keyed by role so adding an item is a one-line change and the
   two lists can't quietly diverge in styling.

   The hrefs are placeholders: these destinations are a later phase, and a real
   path would just 404 today. */
const linksByRole: Record<UserRole, AccountLink[]> = {
  musician: [
    { label: 'My spots', href: '#', icon: IoTicketOutline },
    { label: 'Book a spot', href: '#', icon: IoMusicalNotesOutline },
  ],
  venue: [
    { label: 'My Backstage', href: '#', icon: IoSpeedometerOutline },
    { label: 'Insert your Jam', href: '#', icon: IoAddCircleOutline },
  ],
};

type AccountMenuProps = {
  /* Passed in rather than read from useAuth, because the parent has already
     narrowed the auth state to `authenticated` — taking it as a prop means this
     component doesn't need a second null check that can never fail. */
  user: User;
  onClose: () => void;
};

export default function AccountMenu({ user, onClose }: AccountMenuProps) {
  const { logout } = useAuth();

  const handleLogout = () => {
    onClose();
    /* Local state is cleared whether or not the request lands (see
       AuthContext), so a network failure here leaves the UI correct and there's
       nothing worth interrupting the user with. */
    void logout().catch((error: unknown) => {
      console.error('Logout request failed:', error);
    });
  };

  return (
    <div className="relative w-64 rounded-box border border-secondary bg-base-100 text-base-content shadow-2xl">
      {/* Points back at the badge that opened it. A rotated square rather than a
          border triangle, so it can carry the panel's own pink edge on its two
          exposed sides. */}
      <span
        aria-hidden="true"
        className="absolute -top-1.5 right-6 size-3 rotate-45 border-l border-t border-secondary bg-base-100"
      />

      <ul className="menu w-full p-2">
        {linksByRole[user.role].map(({ label, href, icon: Icon }) => (
          <li key={label}>
            <Link href={href} onClick={onClose} className="gap-3">
              <Icon className="size-5 shrink-0 text-primary" />
              {label}
            </Link>
          </li>
        ))}

        {/* A border on the item rather than daisyUI's .divider, which sets
            flex-grow and stretches inside a flex column. */}
        <li className="mt-1 border-t border-base-300 pt-1">
          <button type="button" onClick={handleLogout} className="gap-3">
            <IoLogOutOutline className="size-5 shrink-0 text-primary" />
            Log out
          </button>
        </li>
      </ul>
    </div>
  );
}
