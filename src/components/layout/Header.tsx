'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import { GiHamburgerMenu } from 'react-icons/gi';

import logo from '@/assets/logo.png';
import MobileMenu from './MobileMenu';
import NavActions from './NavActions';
import NavLinks from './NavLinks';
import UserButton from './UserButton';

/* Roughly a finger's worth of scroll. Small enough that the bar has its
   background before anything light has reached it, large enough that a phone's
   rubber-band bounce at the top doesn't flicker it on and off. */
const SOLID_FROM = 24;

/* Whether the page has moved at all. `useSyncExternalStore` rather than an
   effect and a piece of state: the answer lives outside React and has to be
   right on the *first* client render, which an effect can't do without a
   synchronous setState in its body — and a reload halfway down the page would
   otherwise paint one frame of transparent bar over whatever is there. It also
   gives the server render an explicit answer instead of a hydration mismatch. */
const subscribe = (onChange: () => void) => {
  window.addEventListener('scroll', onChange, { passive: true });

  return () => window.removeEventListener('scroll', onChange);
};

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const scrolled = useSyncExternalStore(
    subscribe,
    () => window.scrollY > SOLID_FROM,
    /* The server has no scroll position, and the top of the page is the only
       state it can honestly render. */
    () => false,
  );

  /* Home is the only page with the video running behind the bar, so it's the
     only one where the header is transparent — and only while the video is
     still what's behind it. The section below the hero is near-white, and white
     nav text on it is a header that has effectively disappeared: the bar was
     fixed all along, which is why this reads as "the header is gone" rather
     than as a colour bug. Every other route is solid from the start. */
  const overVideo = pathname === '/' && !scrolled;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 text-white transition-colors duration-300 ${
        overVideo ? '' : 'bg-brand-navy'
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Oh Jamming — home" className="shrink-0">
          {/* Static import, so width/height come from the file and there's no
              layout shift. priority because it's above the fold. */}
          <Image src={logo} alt="Oh Jamming" priority className="h-9 w-auto" />
        </Link>

        <NavLinks
          className="hidden items-center gap-8 lg:flex"
          linkClassName="font-medium transition-colors hover:text-accent"
        />

        <div className="ml-auto flex items-center gap-3">
          <NavActions className="hidden items-center gap-3 md:flex" />
          <UserButton />

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="cursor-pointer transition-colors hover:text-accent lg:hidden"
          >
            <GiHamburgerMenu className="size-8" />
          </button>
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
