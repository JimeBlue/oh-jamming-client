'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* One source of truth: the bar renders these horizontally on desktop, the
   mobile menu renders the same list stacked. */
const links = [
  { href: '/', label: 'Home' },
  { href: '/jams', label: 'All Jams' },
  { href: '/about', label: 'About us' },
];

const activeClasses =
  'underline decoration-accent decoration-2 underline-offset-8';

type NavLinksProps = {
  className?: string;
  linkClassName?: string;
  /* The mobile menu passes a close handler so tapping a link dismisses it. */
  onNavigate?: () => void;
};

export default function NavLinks({
  className,
  linkClassName,
  onNavigate,
}: NavLinksProps) {
  const pathname = usePathname();

  return (
    <ul className={className}>
      {links.map(({ href, label }) => {
        /* Home has to match exactly or it would light up on every route.
           The rest match by prefix, so /jams/123 keeps "All Jams" underlined. */
        const isActive =
          href === '/' ? pathname === '/' : pathname.startsWith(href);

        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={`${linkClassName ?? ''} ${isActive ? activeClasses : ''}`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
