'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaChartPie, FaRegRectangleList, FaUsers } from 'react-icons/fa6';

/* The rail. Three routes, not three tabs — which is the whole reason this is a
   list of links rather than a `useState` of which panel is showing.

   Each section gets a URL, so the back button steps between them, a venue can
   bookmark the guest list, and a reload lands where they were. Tabs would give
   all three the same address and lose every one of those. It also means Next
   code-splits the panels: the listing pulls in react-markdown and Leaflet, and a
   venue reading the cockpit never downloads either. */
export default function JamDetailNav({ id }: { id: string }) {
  const pathname = usePathname();

  const items = [
    { href: `/my-backstage/${id}`, label: 'Cockpit', Icon: FaChartPie },
    { href: `/my-backstage/${id}/guests`, label: 'Guest list', Icon: FaUsers },
    { href: `/my-backstage/${id}/listing`, label: 'Listing', Icon: FaRegRectangleList },
  ] as const;

  return (
    /* A column beside the content from `lg`, a scrolling strip above it below
       that. One implementation rather than two behind a breakpoint: the items
       are identical either way, and only the axis changes.
       `overflow-x-auto` is what keeps the strip usable at 320px, where three
       labelled items are wider than the screen. */
    <nav
      aria-label="Jam session sections"
      className="shrink-0 bg-brand-indigo-deep px-3 py-3 lg:w-60 lg:px-4 lg:py-8"
    >
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {items.map(({ href, label, Icon }) => {
          /* Exact, not `startsWith`. The cockpit is the parent path of the other
             two, so a prefix test would light it up on all three. */
          const active = pathname === href;

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-field px-4 py-3 font-bold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-base-100 text-primary'
                    : 'text-primary-content/75 hover:bg-white/10 hover:text-primary-content'
                }`}
              >
                <Icon aria-hidden className="size-5 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
