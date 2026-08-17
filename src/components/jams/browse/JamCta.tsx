import Image from 'next/image';
import Link from 'next/link';
import { FaPlugCirclePlus } from 'react-icons/fa6';

import speaker from '@/assets/speaker.png';

/* The cyan band at the foot of the browse: the one thing on a musician's page
   that is aimed at venues.

   Its own component because it is the page's second subject — everything above
   it answers "which night shall I go to?", and this asks a different person a
   different question. Keeping it out of `JamBrowse` also keeps it out of the
   three-state fetch that file is built around: this band has nothing to load and
   never has a loading, error or empty version of itself.

   Cyan rather than the lime it used to be, and rather than the dark teal the
   page's ink is: the home page's stats band is the same full-bleed cyan doing
   the same job one step further down a page, so the two read as one device. Dark
   teal would have been the closer match to the cards above, but the navy footer
   starts immediately under this — two dark blocks meeting with no ground between
   them look like one badly-lit block.

   The speaker is decorative — `alt=""`, so a screen reader meets the heading and
   the link and nothing else. A static import, which is what gives next/image the
   intrinsic size and keeps the band from resizing once it lands. The indigo
   scribble that used to close the row went with the re-brand: it is drawn in the
   old palette's violet, and on cyan it read as a smudge. */
export default function JamCta() {
  return (
    /* Edge to edge, so no rounding and no margin of its own — it is rendered
       outside the page's container in `(site)/jams/page.tsx`, which is what lets
       the cyan run the full width of the window. */
    <section className="mt-16 bg-cyan-blue text-white">
      {/* The contents come back to the page's own 7xl and its padding steps, so
          the heading in here starts where the first card above it does.

          Stacked and centred on a phone, a row from `lg`. */}
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-10 text-center sm:px-6 lg:flex-row lg:gap-10 lg:px-8 lg:text-left">
        <Image src={speaker} alt="" className="h-20 w-auto shrink-0 lg:h-28" />

        <div className="lg:flex-1">
          {/* Space Grotesk, not Changa One — the same face the page's own
              heading and every card title on it are set in, so the band reads as
              the last thing on this page rather than as a strip borrowed from
              somewhere else. It carries its own weight because Changa One had
              only the one and needed none. */}
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Got a jam session to share?
          </h2>

          {/* Two lines, two jobs: the first is the offer, the second is the
              reason it takes minutes. Separate paragraphs rather than one with a
              break, because they are separate sentences. */}
          <p className="mt-3 font-bold">List your jam in minutes</p>
          <p className="text-white/90">Our AI will help you create a great listing.</p>
        </div>

        {/* White filling, inverting to an outline on hover — the same move the
            home page's cyan band makes with its own button, and the border is
            there at rest in the fill's own colour so gaining a visible edge
            doesn't change the button's size. The page's royal blue would be the
            obvious pick and is the wrong one here: blue on cyan is two of the
            same hue, and the one control in the band has to be the thing that
            separates from it. */}
        {/* The same glyph the account menu's "Insert your Jam" wears, and the
            empty backstage board with it — three routes to one page, so they
            should be recognisable as the same door. */}
        <Link
          href="/jams/new"
          className="btn shrink-0 gap-2 border-white bg-white font-bold text-cyan-blue shadow-none transition-colors hover:border-white hover:bg-transparent hover:text-white"
        >
          <FaPlugCirclePlus className="size-5" />
          Insert your jam
        </Link>
      </div>
    </section>
  );
}
