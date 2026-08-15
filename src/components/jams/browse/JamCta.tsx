import Image from 'next/image';
import Link from 'next/link';
import { FaPlugCirclePlus } from 'react-icons/fa6';

import blueRayas from '@/assets/blue-rayas.png';
import speaker from '@/assets/speaker.png';

/* The lime band at the foot of the browse: the one thing on a musician's page
   that is aimed at venues.

   Its own component because it is the page's second subject — everything above
   it answers "which night shall I go to?", and this asks a different person a
   different question. Keeping it out of `JamBrowse` also keeps it out of the
   three-state fetch that file is built around: this band has nothing to load and
   never has a loading, error or empty version of itself.

   Both graphics are decorative — `alt=""`, so a screen reader meets the heading
   and the link and nothing else. Static imports, which is what gives next/image
   the intrinsic sizes and keeps the band from resizing once they land. */
export default function JamCta() {
  return (
    /* Edge to edge, so no rounding and no margin of its own — it is rendered
       outside the page's container in `(site)/jams/page.tsx`, which is what lets
       the lime run the full width of the window. */
    <section className="mt-16 bg-accent text-accent-content">
      {/* The contents come back to the page's own 7xl and its padding steps, so
          the heading in here starts where the first card above it does.

          Stacked and centred on a phone, a row from `lg`. The scribble is the
          one piece that doesn't survive the stack — at the bottom of a centred
          column it is a mark with nothing to sit beside, so it only appears once
          there is a row for it to close. */}
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-10 text-center sm:px-6 lg:flex-row lg:gap-10 lg:px-8 lg:text-left">
        <Image src={speaker} alt="" className="h-20 w-auto shrink-0 lg:h-28" />

        <div className="lg:flex-1">
          <h2 className="font-heading text-2xl sm:text-3xl">
            Got a jam session to share?
          </h2>

          {/* Two lines, two jobs: the first is the offer, the second is the
              reason it takes minutes. Separate paragraphs rather than one with a
              break, because they are separate sentences. */}
          <p className="mt-3 font-bold">List your jam in minutes</p>
          <p>Our AI will help you create a great listing.</p>
        </div>

        {/* Spelled out rather than themed: daisyUI has no slot for "a button in
            the header's navy", and `btn-neutral` is the app's black, which on
            this lime reads as a hole rather than as the brand's darkest indigo.
            The hex still lives only in globals.css. */}
        {/* The same glyph the account menu's "Insert your Jam" wears, and the
            empty backstage board with it — three routes to one page, so they
            should be recognisable as the same door. */}
        <Link
          href="/jams/new"
          className="btn shrink-0 gap-2 border-0 bg-brand-navy font-bold text-white hover:bg-brand-navy/90"
        >
          <FaPlugCirclePlus className="size-5" />
          Insert your jam
        </Link>

        <Image
          src={blueRayas}
          alt=""
          className="hidden h-10 w-auto shrink-0 lg:block"
        />
      </div>
    </section>
  );
}
