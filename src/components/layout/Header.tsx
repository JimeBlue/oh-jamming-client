'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { GiHamburgerMenu } from 'react-icons/gi';

import logo from '@/assets/logo.png';
import MobileMenu from './MobileMenu';
import NavActions from './NavActions';
import NavLinks from './NavLinks';
import UserButton from './UserButton';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  /* Home is the only page with the video running behind the bar, so it's the
     only one where the header is transparent. Every other route gets a solid
     background so the white text stays readable. */
  const overVideo = pathname === '/';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 text-white ${
        overVideo ? '' : 'bg-neutral'
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
