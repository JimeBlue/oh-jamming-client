'use client';

import Link from 'next/link';
import { FaRegClock } from 'react-icons/fa6';
import { FiInfo } from 'react-icons/fi';

import { guestTally, jamReport, type InstrumentTally } from '@/lib/jamReport';
import { useJamDetail } from './JamDetailContext';

/* How the night is doing, in three passes: the totals, then the line-up, then
   the clock.

   Every occupancy number on this screen comes out of `lib/jamReport`, which
   reads the session's spots and never the bookings — the rule and the reason are
   written out there. The three people counts are the exception and come from
   `guestTally`, because a spot knows it is taken and not by whom. */

/* Both sections read the bar the same way now, which they didn't before: the
   slot timeline used to invert it — green while there was still a way in — so
   the same green meant "full" in one section and "not full" two sections down.
   One reading throughout: blue is progress, green is done, and the tone is still
   passed in because the two grade *when* to say done differently. */
const FillBar = ({
  booked,
  total,
  tone,
}: {
  booked: number;
  total: number;
  tone: string;
}) => {
  const percent = total === 0 ? 0 : Math.round((booked / total) * 100);

  return (
    <div className="h-2 w-full min-w-24 overflow-hidden rounded-full bg-royal-blue/10">
      {/* At zero this is a dot, not a bar — a fixed 0.5rem marker rather than a
          2% width. The design has the mark and it earns its place: an empty
          track alone reads as a rendering failure. Sizing it in percent would
          have made it a measurement, and it isn't one. */}
      {booked === 0 ? (
        <span className={`block size-2 rounded-full ${tone}`} />
      ) : (
        <span
          className={`block h-full rounded-full ${tone}`}
          style={{ width: `${percent}%` }}
        />
      )}
    </div>
  );
};

/* Full is the only verdict in the instrument table worth a colour of its own:
   it means stop worrying about this instrument. Everything short of it is the
   royal blue this side of the app is built from, and nothing at all is grey — an
   instrument nobody has taken has no bar to colour, so its marker sits back into
   the track rather than raising an alarm the "Nobody yet" badge beside it
   already raises in words. */
const instrumentTone = (booked: number, total: number): string =>
  booked === 0
    ? 'bg-brand-navy/20'
    : booked === total
      ? 'bg-status-full'
      : 'bg-royal-blue';

/* The slot timeline's, and the same three readings as the table above it — a
   slot nobody has booked gets the muted marker rather than a blue one, because
   at zero the bar is a dot and a blue dot is the shortest possible version of
   "filling up" rather than a picture of nothing.

   Sold out takes the darkened lime rather than the raw token: a bar is a filled
   shape against a track, and the raw lime is 1.08:1 against a pale blue one —
   close enough in lightness that the bar would read as a gap in the track. */
const slotTone = (booked: number, total: number): string =>
  booked === 0
    ? 'bg-brand-navy/20'
    : booked === total
      ? 'bg-status-full'
      : 'bg-royal-blue';

/* The count under each time reads as the same verdict as the bar beside it. */
const slotCountTone = (booked: number, total: number): string =>
  booked === total ? 'text-status-full' : 'text-royal-blue';

const Verdict = ({ booked, total }: { booked: number; total: number }) => {
  if (total > 0 && booked === total) {
    /* The one solid pill on the page, and the only place the raw lime is a fill
       rather than a wash: every other verdict here is a tint, so "there is
       nothing left to do about this instrument" is the one that stops reading as
       a shade of the same answer. */
    return (
      <span className="badge h-auto border-0 text-[12px] bg-brand-green px-3 py-1 font-bold text-dark-teal">
        Full
      </span>
    );
  }

  if (booked === 0) {
    return (
      <span className="badge h-auto border-0 text-[12px] bg-royal-blue/10 px-3 py-1 font-bold text-royal-blue">
        Nobody yet
      </span>
    );
  }

  /* A pill rather than bare text, so the Fill column is three shapes of one
     thing — nothing yet, on the way, done — instead of two badges with a loose
     number between them. */
  return (
    <span className="badge h-auto border-0 text-[12px] bg-brand-green/20 px-3 py-1 font-bold text-dark-teal tabular-nums">
      {Math.round((booked / total) * 100)}%
    </span>
  );
};

/* An instrument inside one slot: "Voice 3/3". Lit in the lime once the last spot
   is gone and left grey until then — which is the whole reason the chips are
   here rather than a second bar, because a slot at 7/12 says nothing about
   *which* seven are left.

   Both wear the page's teal, so the lime is doing all of the work of saying
   which is which. The grey ground under the ones still going is what keeps that
   readable: against white the lit chip was a tint next to paper, and the pale
   lime had to carry the whole distinction on its own.

   The name is whatever the venue typed into the builder, which includes
   "SAXOPHONE" — so it is lowercased and its first letter put back rather than
   left to shout across a row of chips. `capitalize` alone would not do it: it
   only touches the first letter of each word and leaves the rest of a
   caps-locked one as it found it. `first-letter` needs a block container to
   apply to, which is why it sits on the `li` and not on a span around the
   name. */
const SlotChip = ({ instrument, booked, total }: InstrumentTally) => (
  <li
    className={`rounded-field border px-3 py-1 text-[13px] lowercase tabular-nums text-dark-teal first-letter:uppercase ${
      booked === total
        ? 'border-brand-green/50 bg-brand-green/20'
        : 'border-royal-blue/20 bg-base-content/5'
    }`}
  >
    {instrument} <span className="font-bold">{booked}/{total}</span>
  </li>
);

const Section = ({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-box bg-base-100 p-4 shadow-xl sm:p-6">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
      <h2 className="shrink-0 font-display text-[19px] font-bold text-dark-teal">
        {title}
      </h2>
      <p className="max-w-prose text-[13px] text-dark-teal/60">{note}</p>
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

const Tile = ({
  value,
  label,
  note,
}: {
  value: string;
  label: string;
  note: string;
}) => (
  <div className="rounded-box bg-base-100 p-5 shadow-xl">
    {/* Figure in the teal the page's headings wear, label in the blue — these
        three sit beside the filled navy tile, and carrying the page's own two
        colours through is what makes the four read as one set rather than as
        one card and three footnotes.

        The icon marks the line under the number as an explanation of it rather
        than a second reading, which is what the note underneath needs: "aren't
        counted above" is about the tile beside it, not about this one. Same
        cyan glyph as the notes in the builder, so an ⓘ means one thing on both
        sides of the venue's app. */}
    <p className="font-display text-[35px] font-bold text-dark-teal tabular-nums">
      {value}
    </p>
    <p className="mt-1 flex items-center gap-2 text-[15px] font-bold text-royal-blue">
      <FiInfo aria-hidden className="size-4 shrink-0 text-cyan-blue" />
      {label}
    </p>
    <p className="mt-1 text-[13px] text-dark-teal/60">{note}</p>
  </div>
);

export default function CockpitPanel() {
  const { session, bookings } = useJamDetail();

  /* A cancelled session cannot report a fill rate, and the reason is a trap
     rather than a preference: cancelling a session marks every booking cancelled
     but deliberately leaves the spots holding their `bookingId`s, so the spots —
     the source every number below reads — still describe the night as it was
     going to be. Rendering the cockpit here would show a sold-out room for a
     night that isn't happening.

     Counted across every booking rather than the confirmed ones, because there
     are none: the cascade cancelled them all. It does mean this includes anyone
     who had already dropped out on their own before the night was called off —
     the two are indistinguishable once both say `cancelled`, which is why the
     wording is "had booked" rather than "were coming". */
  if (session.status === 'cancelled') {
    const musicians = new Set(bookings.map(({ musician }) => musician.id)).size;

    return (
      <section className="rounded-box border border-status-cancelled/40 bg-status-cancelled/5 p-6 sm:p-8">
        <h2 className="font-display text-[19px] font-bold text-dark-teal">
          This night was called off
        </h2>
        <p className="mt-2 text-[15px] text-dark-teal/70">
          {musicians === 0
            ? 'Nobody had booked a spot when it was cancelled.'
            : `${musicians} musician${musicians === 1 ? '' : 's'} had booked a spot when it was cancelled, and every booking was cancelled with it.`}
        </p>

        {musicians > 0 && (
          <Link
            href={`/my-backstage/${session.id}/guests`}
            className="btn mt-6 border-royal-blue bg-transparent text-[13px] font-bold text-royal-blue shadow-none transition-colors hover:border-royal-blue hover:bg-royal-blue hover:text-white"
          >
            See who was booked
          </Link>
        )}
      </section>
    );
  }

  const report = jamReport(session);
  const tally = guestTally(bookings);
  const slotCount = report.bySlot.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* The lead tile, filled rather than outlined: it is the one number
            somebody opens this page for, and the other three explain it. */}
        <div className="flex flex-col rounded-box bg-brand-navy p-5 text-white shadow-xl">
          {/* mb-4 as well as the note's `mt-auto`: margins don't collapse in a
              flex column, so this is the floor under the gap the auto margin
              then opens out to whatever the row's height gives it. */}
          <div className="mb-4 flex items-center gap-4">
            {/* A ring drawn with a conic gradient over a plain circle — no
                library, no SVG, and it scales with the font. The lime is named
                rather than taken from `currentColor` now: the arc and the label
                inside it are the tile's two brightest things and they are no
                longer the same colour, so tying them together would mean
                lettering the percentage in lime on navy at 8px of stroke. */}
            <div
              role="img"
              aria-label={`${report.fillRate}% of spots booked`}
              className="grid size-20 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(var(--color-brand-green) ${report.fillRate}%, color-mix(in oklab, currentColor 20%, transparent) 0)`,
              }}
            >
              <span className="grid size-14 place-items-center rounded-full bg-brand-navy text-[13px] font-bold tabular-nums">
                {report.fillRate}%
              </span>
            </div>

            <div>
              <p className="font-display text-[35px] font-bold tabular-nums">
                {report.booked}
                <span className="text-[19px] text-white/50"> / {report.total}</span>
              </p>
              <p className="mt-1 text-[15px] font-bold text-brand-green">Spots booked</p>
            </div>
          </div>

          {/* Ruled off and pushed to the foot of the tile: it is a remainder of
              the figure above rather than a third line of it, and `mt-auto`
              keeps it on the tile's bottom edge however tall the row grows to
              fit the three beside it. */}
          <p className="mt-auto border-t border-white/15 pt-3 text-[13px] text-white/60">
            {report.free} still free across {slotCount} slot
            {slotCount === 1 ? '' : 's'}
          </p>
        </div>

        <Tile
          value={String(tally.bookings)}
          label="Bookings"
          note="One submission each — a band taking four spots is one booking, not four"
        />
        <Tile
          value={String(tally.musicians)}
          label="Musicians"
          note="Distinct accounts, so somebody playing two slots is counted once"
        />
        <Tile
          value={String(tally.droppedOut)}
          label="Dropped out"
          note="Cancelled spots. They went back on the board and aren't counted above"
        />
      </div>

      <Section
        title="By instrument"
        note="Totalled across the whole night — an instrument nobody has taken is the one thing here you can still do something about."
      >
        {/* Two layouts of the same five numbers, not one table made to bend.

            Five columns will not fit a phone, and the usual fix — reflowing the
            table to blocks with `display: block` — strips the row and column
            association out of the accessibility tree, leaving fifteen unrelated
            cells. So a phone gets a real list with the column headings restated
            as labels beside each value, and the table starts at `sm` where it
            fits without scrolling.

            The presentation is duplicated; the numbers are not. Both draw the
            same `report.byInstrument`, so the two can disagree about layout and
            never about data. */}
        <ul className="flex flex-col sm:hidden">
          {report.byInstrument.map(({ instrument, booked, total }) => (
            <li
              key={instrument}
              className="border-b border-royal-blue/10 py-4 first:pt-0 last:border-b-0 last:pb-0"
            >
              <p className="text-[15px] font-bold text-dark-teal">{instrument}</p>

              {/* A description list because that is what these are — three
                  labels and their values — and a two-column grid so the labels
                  line up down the card rather than each row finding its own
                  indent. */}
              <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-[13px] text-dark-teal">
                <dt className="text-dark-teal/50">Booked</dt>
                <dd className="tabular-nums">
                  {booked} <span className="text-dark-teal/40">/ {total}</span>
                </dd>

                <dt className="text-dark-teal/50">Free</dt>
                <dd className="tabular-nums">{total - booked}</dd>

                <dt className="text-dark-teal/50">Fill</dt>
                <dd className="flex items-center gap-3">
                  <FillBar
                    booked={booked}
                    total={total}
                    tone={instrumentTone(booked, total)}
                  />
                  <Verdict booked={booked} total={total} />
                </dd>
              </dl>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto sm:block">
          <table className="table text-[13px]">
            {/* daisyUI sets both of these inside `:where()`, so a plain utility
                outranks them — no `!` needed to move the heads off the theme's
                grey and the rules off its indigo-tinted `base-200`. */}
            <thead className="text-[11px] text-dark-teal/50">
              <tr className="border-royal-blue/10">
                <th>Instrument</th>
                <th>Booked</th>
                <th>Free</th>
                <th className="w-1/3">Fill</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {report.byInstrument.map(({ instrument, booked, total }) => (
                <tr key={instrument} className="border-royal-blue/10">
                  <td className="font-bold text-dark-teal">{instrument}</td>
                  <td className="tabular-nums text-dark-teal">
                    {booked} <span className="text-dark-teal/40">/ {total}</span>
                  </td>
                  <td className="tabular-nums text-dark-teal/60">{total - booked}</td>
                  <td>
                    <FillBar
                      booked={booked}
                      total={total}
                      tone={instrumentTone(booked, total)}
                    />
                  </td>
                  <td>
                    <Verdict booked={booked} total={total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="By slot"
        note="The view to read on the night itself, in order, at the door. A quiet late slot is invisible in the totals above."
      >
        <ul className="flex flex-col">
          {report.bySlot.map(({ slotId, startTime, endTime, booked, total, byInstrument }) => (
            <li
              key={slotId}
              className="grid gap-3 border-b border-royal-blue/10 py-4 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5"
            >
              {/* The clock sits against the time rather than centred across
                  both lines, and the count is indented under it — the same
                  arrangement as the header card's address and date blocks, so
                  the page has one way of pairing an icon with two lines.

                  Grey rather than the time's own teal. Six of these run down
                  the section and they all say the same thing, so at the times'
                  own weight the column reads as a stack of glyphs with the
                  hours behind them. */}
              <div className="flex items-start gap-2 text-dark-teal">
                <FaRegClock
                  aria-hidden
                  className="mt-1 size-4 shrink-0 text-base-content/40"
                />
                <div>
                  <p className="text-[13px] font-bold tabular-nums">
                    {startTime}–{endTime}
                  </p>
                  <p
                    className={`text-[13px] font-bold tabular-nums ${slotCountTone(booked, total)}`}
                  >
                    {booked} / {total} booked
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <FillBar booked={booked} total={total} tone={slotTone(booked, total)} />
                <ul className="flex flex-wrap gap-2">
                  {byInstrument.map((line) => (
                    <SlotChip key={line.instrument} {...line} />
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
