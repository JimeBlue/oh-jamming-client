'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { withNext } from '@/lib/nextPath';
import type { UserRole } from '@/schemas/user';

/* `activeTab` carries the same pink-for-musicians, indigo-for-venues pairing
   RegisterForm paints the heading and the submit button with — the tab is the
   first place a visitor meets it, so it has to be the same two colours or the
   card below looks like it belongs to a different page.

   Set through daisyUI's own `--tab-bg` rather than a `bg-*` class: with
   tabs-lift the active tab is drawn as a shape with rounded joins either side,
   and those are painted from that variable. A background class colours the box
   and leaves the joins white.

   `--tab-border-color` goes with it, or the tab keeps the pale lilac edge
   daisyUI gives it (base-300) — which is invisible on a white tab and reads as
   a white outline on a coloured one. Matched to the fill rather than removed,
   because the border is what the shape is drawn with. */
const tabs: {
  role: UserRole;
  label: string;
  href: string;
  activeTab: string;
}[] = [
  {
    role: 'musician',
    label: 'Register as a musician',
    href: '/register/musician',
    activeTab:
      '[--tab-bg:var(--color-secondary)] [--tab-border-color:var(--color-secondary)]',
  },
  {
    role: 'venue',
    label: 'Register as a venue',
    href: '/register/venue',
    activeTab:
      '[--tab-bg:var(--color-primary)] [--tab-border-color:var(--color-primary)]',
  },
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
      {tabs.map(({ role, label, href, activeTab }) => {
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
            className={`tab font-bold ${
              isActive
                ? `tab-active ${activeTab} text-white`
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
