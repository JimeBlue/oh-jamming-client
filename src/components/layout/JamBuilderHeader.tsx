import Image from 'next/image';
import Link from 'next/link';

import logo from '@/assets/logo.png';
import UserButton from './UserButton';

/* The builder's own bar. Deliberately not the site header with a prop on it:
   this one isn't navigation, it's an exit — one way out, and nothing else to
   click while someone is halfway through eight steps.

   The account badge is the real reason this is only thirty lines. UserButton
   already owns the loading/authenticated/anonymous branching, the initial, the
   chevron and the menu, and it renders white-on-dark, so it drops straight in. */
export default function JamBuilderHeader() {
  return (
    /* In the flow rather than fixed, unlike the site header — there's no video
       to overlay here, and it saves every page under this layout having to pad
       itself out from under it.

       Navy rather than the builder's indigo: this bar and the site header are
       the same bar as far as anyone crossing between /jams and /my-backstage is
       concerned, and a second brand colour at the top of the screen reads as
       having landed somewhere else. */
    <header className="bg-brand-navy text-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Oh Jamming — home" className="shrink-0">
          <Image src={logo} alt="Oh Jamming" priority className="h-9 w-auto" />
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {/* Outline rather than solid: leaving is the secondary action on this
              page, and it shouldn't compete with "Go to the next step". */}
          <Link
            href="/"
            className="btn btn-outline btn-accent btn-sm font-bold sm:btn-md"
          >
            Back to home
          </Link>

          <UserButton />
        </div>
      </div>
    </header>
  );
}
