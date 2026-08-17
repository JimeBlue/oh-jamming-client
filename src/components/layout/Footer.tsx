import Image from 'next/image';
import { FaSpotify } from 'react-icons/fa';
import { MdEmail } from 'react-icons/md';
import { RiInstagramFill } from 'react-icons/ri';

import logo from '@/assets/logo.png';

/* The site footer, on every page the public header wears.

   Navy rather than the pale ground the design shows, and the reason is the
   logo: `logo.png` sets "oh" in white, so on a near-white footer the word
   disappears and the mark reads as "Jamming". It is the header's own colour,
   which makes the page bookend, and it is far enough from the hosts band's dark
   teal above it that the two don't run together.

   A server component. Nothing here fetches, and nothing here is even a link
   yet. */

/* None of these go anywhere. They are the map of a site that doesn't have all
   its pages, so they render as buttons rather than as `<Link href="#">`: a
   focusable control that does nothing is honest about being unfinished, where
   an anchor to `#` promises a destination and scrolls the page to prove it
   doesn't have one. Swapping one for `<Link href>` is a one-line change per
   entry when the page it names exists. */
const GROUPS = [
  {
    title: 'Play',
    links: ['All jams', 'Book a spot', 'Beginner friendly', 'Cities', 'My bookings'],
  },
  {
    title: 'Host',
    links: ['Insert your jam', 'See a sample jam', 'Door scanning', 'Venue guide', 'Pricing'],
  },
  { title: 'Company', links: ['About us', 'Contact', 'Help centre', 'Press'] },
];

const LEGAL = ['Privacy', 'Terms', 'Cookies', 'Imprint'];

/* Same three the brand actually has somewhere to point at, once they exist. */
const SOCIALS = [
  { label: 'Oh Jamming on Instagram', icon: RiInstagramFill },
  { label: 'Oh Jamming on Spotify', icon: FaSpotify },
  { label: 'Email Oh Jamming', icon: MdEmail },
];

/* One hover for everything in here, taken from the social icon in the design:
   the thing you are pointing at fills in. On navy that means the accent green,
   which is also the header's link hover — the footer is the same navigation
   twice, so it should not answer the mouse in a second language. */
const LINK = 'w-fit cursor-pointer text-left text-white/80 transition-colors hover:text-accent';

export default function Footer() {
  return (
    <footer className="bg-brand-navy px-4 pb-10 pt-16 text-white sm:px-6 sm:pt-20 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* Stacked until `lg`: the brand block is a paragraph and the groups are
            a 2×2 grid, and side by side at tablet width neither gets a column
            wide enough to keep its lines whole. */}
        <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
          <div>
            <Image src={logo} alt="Oh Jamming" className="h-9 w-auto" />

            <p className="mt-6 max-w-sm text-white/70">
              Open jam sessions in every city we can reach. Bring one instrument,
              take a slot, plug in.
            </p>

            <ul className="mt-6 flex items-center gap-3">
              {SOCIALS.map(({ label, icon: Icon }) => (
                <li key={label}>
                  <button
                    type="button"
                    aria-label={label}
                    className="grid size-11 cursor-pointer place-items-center rounded-full border border-white/25 text-white transition-colors hover:border-accent hover:bg-accent hover:text-brand-navy"
                  >
                    <Icon aria-hidden className="size-5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* `nav` with a name, because a screen reader landing in a landmark
              called "navigation" at the bottom of every page needs to know it is
              the footer's and not the header's. */}
          {/* Two columns until `lg`, three above it. Four groups over two
              columns is a filled 2×2; over three it is a full row and one
              stranded group, which is why the jump waits for the width where
              Legal leaves the grid for the bottom bar. */}
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-3 lg:gap-x-12"
          >
            {GROUPS.map(({ title, links }) => (
              <div key={title}>
                <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-cyan-blue">
                  {title}
                </h2>

                <ul className="mt-5 flex flex-col gap-3">
                  {links.map((link) => (
                    <li key={link}>
                      <button type="button" className={LINK}>
                        {link}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* The legal links are a fourth column here and a row in the bottom
                bar from `lg`, which is what the two designs show — so they are
                written twice and each width hides the other outright. `hidden`
                is `display: none`, so only one is ever in the accessibility
                tree and a screen reader is not offered "Privacy" twice. */}
            <div className="lg:hidden">
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-cyan-blue">
                Legal
              </h2>

              <ul className="mt-5 flex flex-col gap-3">
                {LEGAL.map((link) => (
                  <li key={link}>
                    <button type="button" className={LINK}>
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/15 pt-8 sm:mt-16 lg:flex-row lg:items-center lg:justify-between">
          {/* The year from the clock rather than typed in, so the one line on
              the page that dates the whole site can't go stale. This renders on
              the server, so it is the server's year — close enough for a
              copyright line, and it avoids a hydration mismatch on New Year. */}
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} ohJamming. Made for people who show up with
            an instrument.
          </p>

          <ul className="hidden items-center gap-8 lg:flex">
            {LEGAL.map((link) => (
              <li key={link}>
                <button type="button" className={`${LINK} text-sm`}>
                  {link}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
