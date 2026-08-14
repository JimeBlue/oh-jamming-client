'use client';

import Link from 'next/link';
import { AiFillClockCircle } from 'react-icons/ai';

import { guestTally, jamReport, type InstrumentTally } from '@/lib/jamReport';
import { useJamDetail } from './JamDetailContext';

/* How the night is doing, in three passes: the totals, then the line-up, then
   the clock.

   Every occupancy number on this screen comes out of `lib/jamReport`, which
   reads the session's spots and never the bookings — the rule and the reason are
   written out there. The three people counts are the exception and come from
   `guestTally`, because a spot knows it is taken and not by whom. */

/* The two sections read the same bar in opposite directions, so the colour is
   passed in rather than worked out here.

   In the instrument table it grades the venue's own worry: green once an
   instrument is full, pink while nobody has touched it. In the slot timeline
   below it answers a musician's question instead — green while there is still a
   way in, pink once the door is shut — which is the same green and the same pink
   meaning the opposite things two sections apart. Worth knowing before either is
   changed. */
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
    <div className="h-2 w-full min-w-24 overflow-hidden rounded-full bg-base-300">
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
   ordinary indigo, and nothing at all is grey — an instrument nobody has taken
   has no bar to colour, so its marker sits back into the track rather than
   raising an alarm the "Nobody yet" badge beside it already raises in words. */
const instrumentTone = (booked: number, total: number): string =>
  booked === 0
    ? 'bg-base-content/20'
    : booked === total
      ? 'bg-status-full'
      : 'bg-primary';

/* The slot timeline's, and it only has the two: a slot is either still open or
   it is sold out. There is no third state to grade, because "how full" is
   already the length of the bar.

   The open bar takes the deepened lime rather than either the raw brand green or
   the label green. A bar is a filled shape against a track, so what has to be
   legible is its *length* — and the raw lime is 1.08:1 against `base-300`, close
   enough in lightness that a half-full slot and a quarter-full one read as the
   same bar in a different colour. */
const slotTone = (booked: number, total: number): string =>
  booked === total ? 'bg-status-taken' : 'bg-brand-green-deep';

/* The count under each time reads as the same verdict as the bar beside it, in
   the label colours rather than the bar's — this one *is* text, so the lime
   would be a rumour of a number. */
const slotCountTone = (booked: number, total: number): string =>
  booked === total ? 'text-status-taken' : 'text-status-upcoming';

const Verdict = ({ booked, total }: { booked: number; total: number }) => {
  if (total > 0 && booked === total) {
    return (
      <span className="badge h-auto border-0 bg-status-full/15 px-3 py-1 font-bold text-status-full">
        Full
      </span>
    );
  }

  if (booked === 0) {
    return (
      <span className="badge h-auto border-0 bg-primary/10 px-3 py-1 font-bold text-primary">
        Nobody yet
      </span>
    );
  }

  return (
    <span className="tabular-nums text-base-content/60">
      {Math.round((booked / total) * 100)}%
    </span>
  );
};

/* An instrument inside one slot: "Voice 3/3". Green while a spot is still going,
   pink once the last one is gone — which is the whole reason the chips are here
   rather than a second bar, because a slot at 7/12 says nothing about *which*
   seven are left.

   The green pair is the Upcoming badge's exactly, brand lime at low alpha under
   the darkened lime it is named for: the raw token is 1.2:1 on white and would
   be a rumour of a label rather than one. */
const SlotChip = ({ instrument, booked, total }: InstrumentTally) => (
  <li
    className={`rounded-field px-3 py-1 text-sm tabular-nums ${
      booked === total
        ? 'bg-status-taken/10 text-status-taken'
        : 'bg-brand-green/20 text-status-upcoming'
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
      <h2 className="shrink-0 font-heading text-xl">{title}</h2>
      <p className="max-w-prose text-sm text-base-content/80">{note}</p>
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
    {/* Figure and label in indigo, the explanation left in the page's ordinary
        grey — these three tiles sit beside the filled indigo one, and carrying
        its colour through the numbers is what makes the four read as one set
        rather than as one card and three footnotes. */}
    <p className="font-heading text-4xl tabular-nums text-primary">{value}</p>
    <p className="mt-1 font-bold text-primary">{label}</p>
    <p className="mt-1 text-sm text-base-content/70">{note}</p>
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
        <h2 className="font-heading text-xl">This night was called off</h2>
        <p className="mt-2 text-base-content/80">
          {musicians === 0
            ? 'Nobody had booked a spot when it was cancelled.'
            : `${musicians} musician${musicians === 1 ? '' : 's'} had booked a spot when it was cancelled, and every booking was cancelled with it.`}
        </p>

        {musicians > 0 && (
          <Link
            href={`/my-backstage/${session.id}/guests`}
            className="btn btn-outline btn-primary mt-6 font-bold"
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
        <div className="rounded-box bg-primary p-5 text-primary-content shadow-xl">
          <div className="flex items-center gap-4">
            {/* A ring drawn with a conic gradient over a plain circle — no
                library, no SVG, and it scales with the font. `currentColor` is
                the tile's own text colour, so the two can't drift apart. */}
            <div
              role="img"
              aria-label={`${report.fillRate}% of spots booked`}
              className="grid size-20 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(currentColor ${report.fillRate}%, color-mix(in oklab, currentColor 25%, transparent) 0)`,
              }}
            >
              <span className="grid size-14 place-items-center rounded-full bg-primary text-sm font-bold tabular-nums">
                {report.fillRate}%
              </span>
            </div>

            <div>
              <p className="font-heading text-4xl tabular-nums">
                {report.booked}
                <span className="text-xl opacity-70"> / {report.total}</span>
              </p>
              <p className="mt-1 font-bold">Spots booked</p>
            </div>
          </div>

          <p className="mt-3 text-sm opacity-80">
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
              className="border-b border-base-200 py-4 first:pt-0 last:border-b-0 last:pb-0"
            >
              <p className="font-bold">{instrument}</p>

              {/* A description list because that is what these are — three
                  labels and their values — and a two-column grid so the labels
                  line up down the card rather than each row finding its own
                  indent. */}
              <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-sm">
                <dt className="text-base-content/60">Booked</dt>
                <dd className="tabular-nums">
                  {booked} <span className="text-base-content/40">/ {total}</span>
                </dd>

                <dt className="text-base-content/60">Free</dt>
                <dd className="tabular-nums">{total - booked}</dd>

                <dt className="text-base-content/60">Fill</dt>
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
          <table className="table">
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Booked</th>
                <th>Free</th>
                <th className="w-1/3">Fill</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {report.byInstrument.map(({ instrument, booked, total }) => (
                <tr key={instrument}>
                  <td className="font-bold">{instrument}</td>
                  <td className="tabular-nums">
                    {booked} <span className="text-base-content/40">/ {total}</span>
                  </td>
                  <td className="tabular-nums text-base-content/70">{total - booked}</td>
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
              className="grid gap-3 border-b border-base-200 py-4 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5"
            >
              {/* The clock sits against the time rather than centred across
                  both lines, and the count is indented under it — the same
                  arrangement as the header card's address and date blocks, so
                  the page has one way of pairing an icon with two lines.

                  No colour on the icon: it inherits, so it is the time's own
                  colour by construction rather than by a second class that has
                  to be kept in step with it. */}
              <div className="flex items-start gap-2">
                <AiFillClockCircle aria-hidden className="mt-1 size-4 shrink-0" />
                <div>
                  <p className="font-bold tabular-nums">
                    {startTime}–{endTime}
                  </p>
                  <p
                    className={`text-sm font-bold tabular-nums ${slotCountTone(booked, total)}`}
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
