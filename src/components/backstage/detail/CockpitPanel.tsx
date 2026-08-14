'use client';

import Link from 'next/link';

import { guestTally, jamReport, type InstrumentTally } from '@/lib/jamReport';
import { useJamDetail } from './JamDetailContext';

/* How the night is doing, in three passes: the totals, then the line-up, then
   the clock.

   Every occupancy number on this screen comes out of `lib/jamReport`, which
   reads the session's spots and never the bookings — the rule and the reason are
   written out there. The three people counts are the exception and come from
   `guestTally`, because a spot knows it is taken and not by whom. */

/* Full and empty are the only two verdicts worth a colour: one means stop
   worrying about this instrument, the other means nobody has touched it. Every
   value in between is a percentage, which says more than a shade would. */
const toneFor = (booked: number, total: number): string =>
  booked === 0 ? 'bg-status-empty' : booked === total ? 'bg-status-full' : 'bg-primary';

const FillBar = ({ booked, total }: { booked: number; total: number }) => {
  const percent = total === 0 ? 0 : Math.round((booked / total) * 100);

  return (
    <div className="h-2 w-full min-w-24 overflow-hidden rounded-full bg-base-300">
      {/* At zero this is a dot, not a bar — a fixed 0.5rem marker rather than a
          2% width. The design has the mark and it earns its place: an empty
          track alone reads as a rendering failure. Sizing it in percent would
          have made it a measurement, and it isn't one. */}
      {booked === 0 ? (
        <span className="block size-2 rounded-full bg-status-empty" />
      ) : (
        <span
          className={`block h-full rounded-full ${toneFor(booked, total)}`}
          style={{ width: `${percent}%` }}
        />
      )}
    </div>
  );
};

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
      <span className="badge h-auto border-0 bg-status-empty/10 px-3 py-1 font-bold text-status-empty">
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

/* An instrument inside one slot: "Voice 3/3". Pink when nobody has taken it,
   which is the whole reason the chips are here rather than a second bar — a slot
   at 7/12 says nothing about *which* seven. */
const SlotChip = ({ instrument, booked, total }: InstrumentTally) => (
  <li
    className={`rounded-field px-3 py-1 text-sm tabular-nums ${
      booked === 0 ? 'bg-status-empty/10 text-status-empty' : 'bg-base-200'
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
    <p className="font-heading text-4xl tabular-nums">{value}</p>
    <p className="mt-1 font-bold">{label}</p>
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
        <div className="overflow-x-auto">
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
                    <FillBar booked={booked} total={total} />
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
              <div>
                <p className="font-bold tabular-nums">
                  {startTime}–{endTime}
                </p>
                <p className="text-sm tabular-nums text-base-content/60">
                  {booked} / {total} booked
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <FillBar booked={booked} total={total} />
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
