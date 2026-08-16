'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { withNext } from '@/lib/nextPath';
import type { UserRole } from '@/schemas/user';

const tabs: { role: UserRole; label: string; href: string }[] = [
  {
    role: 'musician',
    label: 'Register as a musician',
    href: '/register/musician',
  },
  { role: 'venue', label: 'Register as a venue', href: '/register/venue' },
];

/* Links rather than buttons, because the tabs *are* the routes — switching them
   changes the URL, so the choice survives a refresh, a back button, and a shared
   link. That's also what keeps role out of the form: it comes from the address
   bar, where a stray click can't change it. */
/* Client only so the tabs can keep `?next=` on both hrefs — switching tab is a
   navigation, and a destination that survives login has to survive changing your
   mind about which account to create. Same hook LoginForm reads it with. */
export default function RoleTabs({ activeRole }: { activeRole: UserRole }) {
  const next = useSearchParams().get('next');

  return (
    <div role="tablist" className="tabs tabs-lift">
      {tabs.map(({ role, label, href }) => {
        const isActive = role === activeRole;

        return (
          <Link
            key={role}
            href={withNext(href, next)}
            role="tab"
            aria-selected={isActive}
            /* daisyUI styles an inactive tab as base-content at 50% alpha on a
               transparent background — which assumes the tab bar sits on a
               page-coloured surface. Here it sits on a photograph, where that
               is unreadable, so the inactive tab gets its own translucent
               surface and full-strength text. */
            className={`tab ${
              isActive
                ? 'tab-active'
                : 'bg-base-100/70 text-base-content backdrop-blur-sm'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
