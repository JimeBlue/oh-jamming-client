import Link from 'next/link';

import megaphone from '@/assets/megaphone.png';
import MaskIcon from '@/components/ui/MaskIcon';

/* The venue's half of the page, after three sections addressed to musicians.

   Deliberately the only dark band on the home page. Everything above it is the
   musician's route — pale ground, cyan band, white cards — and this is the one
   place the site speaks to the other role, so the change of ground is what says
   "this paragraph is not about you" to a musician scrolling past. Its accent is
   the site's green rather than the steps' blue and cyan for the same reason.

   A server component: two links and four fixed numbers, nothing to fetch. */

/* Written into the file rather than counted, unlike the cyan band above — these
   are claims about the product, not about the board, and three of the four are
   facts of the app itself (the wizard's default slot length, what listing
   costs, roughly how long publishing takes). `92%` is the exception: it is the
   one number here the database could actually contradict. */
/* The session "See a sample jam" opens — one real listing, chosen because it
   shows a full board rather than because of anything in the code. It is a row
   in a database this file can't see, so if it is ever cancelled or deleted the
   button lands on a not-found page; that is the cost of showing one night
   instead of the whole board, and the fix is to put another id here. */
const SAMPLE_JAM_ID = '6a7f0cccd2ad14310663d115';

const STATS = [
  { value: '4 min', label: 'to publish a session' },
  { value: '92%', label: 'of slots get filled' },
  { value: '15 min', label: 'default slot length' },
  { value: '0 €', label: 'to list a jam' },
];

export default function HomeHosts() {
  return (
    <section
      aria-labelledby="home-hosts-heading"
      className="relative overflow-hidden bg-dark-teal px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8"
    >
      {/* The watermark, not an illustration: it repeats the chip in the eyebrow
          at the size of the section, so it carries no meaning of its own and
          goes through `MaskIcon` — the artwork is black line work, invisible on
          this ground, and the mask lets the theme colour it instead of the file
          being committed a second time in green.

          Whole and inside the frame rather than bled off the right edge: the
          artwork is a single closed outline, so cropping it doesn't read as a
          detail enlarged, it reads as a picture that didn't fit.

          Where it sits depends on where the text isn't. At `lg` the copy has a
          column and the watermark takes the empty half, centred against it. At
          `md` there is no empty half — the copy runs the width — so it goes to
          the top, beside the two short heading lines rather than across the
          paragraph and the buttons, which are the lines being read.

          `md` and up. There is no room beside the text on a phone, and it is
          the one thing here that carries nothing. */}
      <MaskIcon
        src={megaphone.src}
        className="pointer-events-none absolute right-4 top-10 hidden size-44 bg-accent/[0.07] md:block lg:right-12 lg:top-1/2 lg:size-80 lg:-translate-y-1/2 2xl:right-40"
      />

      {/* max-w-3xl inside the page's container: the copy keeps the left edge the
          sections above it use, and the watermark gets the space on the right
          instead of the text running under it. */}
      <div className="relative mx-auto w-full max-w-7xl">
        <div className="max-w-3xl">
          <p className="flex items-center gap-3 font-display text-sm font-bold uppercase tracking-[0.2em] text-accent">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-box bg-accent"
            >
              <MaskIcon src={megaphone.src} className="size-5 bg-dark-teal" />
            </span>
            For hosts · Open call
          </p>

          <h2
            id="home-hosts-heading"
            className="mt-6 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
          >
            <span className="block">Put out the call.</span>
            <span className="block text-accent">We fill the stage.</span>
          </h2>

          <p className="mt-5 max-w-2xl text-white/80 sm:text-lg">
            Publish the night, set the slots and the instruments in each one, and
            watch the board fill itself. Every player turns up with a QR code, so
            the door is a scan instead of a clipboard.
          </p>

          {/* Stacked and full width until `lg`, side by side above it — the
              same breakpoint the stats use, so the block changes shape once
              rather than twice on the way to a desktop. Both are
              links rather than buttons — `/jams/new` is behind `RequireRole`,
              which sends a signed-out venue through `/login?next=…` and explains
              itself to a musician, so there is nothing to gate here. */}
          <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:gap-4">
            <Link
              href="/jams/new"
              className="btn h-12 border-accent bg-accent px-8 font-display text-base font-bold text-dark-teal shadow-none transition-colors hover:border-accent hover:bg-transparent hover:text-accent"
            >
              Insert your Jam
            </Link>

            <Link
              href={`/jams/${SAMPLE_JAM_ID}`}
              className="btn h-12 border-white/40 bg-transparent px-8 font-display text-base font-bold text-white shadow-none transition-colors hover:border-white hover:bg-white hover:text-dark-teal"
            >
              See a sample jam
            </Link>
          </div>

          {/* 2×2 on a phone, one row from `lg`. The rule above them is the only
              divider on the page: the numbers are a footnote to the pitch, not a
              fifth section. */}
          <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-white/15 pt-8 sm:mt-12 lg:grid-cols-4">
            {STATS.map(({ value, label }) => (
              /* `flex-col-reverse` so the value can be drawn above its label
                 while the markup keeps the term before its description — the
                 number is meaningless without the words, and reading order is
                 the one place that has to stay true. */
              <div key={label} className="flex flex-col-reverse">
                <dt className="mt-1 text-sm text-white/70">{label}</dt>
                <dd className="font-display text-3xl font-bold tabular-nums text-accent sm:text-4xl">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
