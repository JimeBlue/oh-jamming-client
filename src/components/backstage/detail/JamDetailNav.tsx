'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaRegRectangleList, FaUsers } from 'react-icons/fa6';
import { RiDashboard3Fill } from 'react-icons/ri';

/* The rail. Three routes, not three tabs — which is the whole reason this is a
   list of links rather than a `useState` of which panel is showing.

   Each section gets a URL, so the back button steps between them, a venue can
   bookmark the guest list, and a reload lands where they were. Tabs would give
   all three the same address and lose every one of those. It also means Next
   code-splits the panels: the listing pulls in react-markdown and Leaflet, and a
   venue reading the cockpit never downloads either.

   daisyUI's `menu`, which already knows how to be a row on a narrow screen and a
   column on a wide one — `menu-horizontal` swapped for `menu-vertical` at `lg`
   is the entire responsive story, where hand-rolled flex needed the axis, the
   gaps and the item widths all restated per breakpoint. */
export default function JamDetailNav({ id }: { id: string }) {
  const pathname = usePathname();

  const items = [
    { href: `/my-backstage/${id}`, label: 'Cockpit', Icon: RiDashboard3Fill },
    { href: `/my-backstage/${id}/guests`, label: 'Guest list', Icon: FaUsers },
    { href: `/my-backstage/${id}/listing`, label: 'Listing', Icon: FaRegRectangleList },
  ] as const;

  return (
    <nav
      aria-label="Jam session sections"
      className="shrink-0 bg-brand-indigo-deep lg:w-60 xl:w-auto"
    >
      {/* Left-aligned at every width. As a horizontal strip this is the only
          thing on its row, so centring floated it away from the page's own left
          edge and read as decoration rather than as navigation. At `lg` the axis
          turns and the question stops arising. */}
      <ul className="menu menu-horizontal w-full justify-start gap-1 p-2 lg:menu-vertical lg:p-4 lg:pt-8">
        {items.map(({ href, label, Icon }) => {
          /* Exact, not `startsWith`. The cockpit is the parent path of the other
             two, so a prefix test would light it up on all three. */
          const active = pathname === href;

          return (
            <li key={href} className="lg:w-full">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                /* The tooltip stands in for the label wherever the word is
                   hidden, so it is scoped to exactly those widths — below `sm`,
                   and again from `xl`. In between the word is right there and a
                   tooltip repeating it would be noise. */
                data-tip={label}
                className={`max-sm:tooltip max-sm:tooltip-bottom font-bold xl:tooltip xl:tooltip-right ${
                  active
                    ? 'bg-base-100 text-primary hover:bg-base-100'
                    : 'text-primary-content/75 hover:bg-white/10 hover:text-primary-content'
                }`}
              >
                {/* Bigger where it is the only thing there is to aim at — a
                    phone has no hover, so the glyph carries the meaning and the
                    tap target on its own. */}
                <Icon aria-hidden className="size-6 shrink-0 sm:size-5" />
                {/* `sr-only` rather than `hidden`: the icon is decorative, so
                    hiding the words outright would leave the link with no
                    accessible name at all — three unlabelled buttons to anyone
                    using a screen reader. This way the name survives at every
                    width and only the pixels go.

                    Gone below `sm` for room, and gone again from `xl` for the
                    opposite reason — there the rail gives its width back to the
                    guest list's nine columns rather than spending it on three
                    words. */}
                <span className="max-sm:sr-only xl:sr-only">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
