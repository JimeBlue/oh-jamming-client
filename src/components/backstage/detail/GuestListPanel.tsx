'use client';

import { useState } from 'react';
import { FaMagnifyingGlass } from 'react-icons/fa6';

import { inGuestOrder } from '@/lib/jamReport';
import { APP_TIMEZONE } from '@/lib/time';
import type { Booking } from '@/schemas/booking';
import { useJamDetail } from './JamDetailContext';

/* Who is playing, one row per booked spot.

   Flat rather than grouped by band, which is the one thing this doesn't inherit
   from the way the API stores it: a band's four spots share a `groupId` and read
   naturally as one card, but a card can't be sorted by instrument or filtered to
   one slot, and those are the questions a venue actually brings here. The band
   survives as a column, so nothing is lost — a group is four adjacent rows with
   the same name in it.

   Cancelled bookings are in the same table, marked, rather than in a list of
   their own. They are the record of who dropped out, and the reason they can sit
   here safely is that nothing on this screen is counted: the occupancy numbers
   live on the cockpit and read the session's spots, so a row here can never
   inflate them. */

/* Formatted in the venue's own city rather than the reader's, matching every
   other time in the app — `createdAt` is a real instant, so it is the one value
   on this page a timezone can move. Built once at module load. */
const bookedOn = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIMEZONE,
  day: 'numeric',
  month: 'short',
});

const ALL = 'all';

const StatusChip = ({ status }: { status: Booking['status'] }) =>
  status === 'cancelled' ? (
    <span className="badge h-auto border-0 bg-status-empty/10 px-3 py-1 font-bold text-status-empty">
      Dropped out
    </span>
  ) : (
    <span className="badge h-auto border-0 bg-primary/10 px-3 py-1 font-bold text-primary">
      Booked
    </span>
  );

export default function GuestListPanel() {
  const { session, bookings } = useJamDetail();

  const [query, setQuery] = useState('');
  const [slotId, setSlotId] = useState<string>(ALL);
  const [instrument, setInstrument] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);

  const needle = query.trim().toLowerCase();

  /* Not memoised. The cap is 300 spots per session (MAX_SPOTS_PER_SESSION), so
     this is a few hundred string comparisons per keystroke on an array that is
     already in memory — cheaper than the bookkeeping to avoid it. */
  const rows = inGuestOrder(bookings).filter(
    (booking) =>
      (slotId === ALL || booking.slotId === slotId) &&
      (instrument === ALL || booking.instrument === instrument) &&
      (status === ALL || booking.status === status) &&
      (needle === '' ||
        `${booking.musician.firstName} ${booking.musician.lastName} ${booking.bandName ?? ''}`
          .toLowerCase()
          .includes(needle)),
  );

  const filtered = rows.length !== bookings.length;

  return (
    <section className="rounded-box bg-base-100 p-4 shadow-xl sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
        <h2 className="shrink-0 font-heading text-xl">Guest list</h2>
        <p className="max-w-prose text-sm text-base-content/80">
          One row per spot, so a band taking four of them is four rows sharing a
          name.
        </p>
      </div>

      {bookings.length === 0 ? (
        <p className="mt-8 rounded-box bg-base-200 p-8 text-center text-base-content/70">
          Nobody has booked a spot on this night yet.
        </p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-box bg-base-200 p-3">
            {/* The four controls wrap among themselves, inside one item that
                takes whatever the count doesn't. Left flat in a single
                container, `ml-auto` on the count pushes it only to the end of
                *its own line* — so the last filter drops below it and the count
                ends up sitting mid-row. */}
            <div className="flex flex-1 flex-wrap items-center gap-3">
              {/* The options come from the *session*, not from the bookings, so
                  every slot and every instrument is listed whether or not anyone
                  took it. Filtering to one and being told nobody is there is an
                  answer; a dropdown that quietly omits the empty ones can't give
                  it. */}
              <label className="input input-bordered flex min-w-48 flex-1 items-center gap-2 bg-base-100">
                <FaMagnifyingGlass aria-hidden className="size-4 text-base-content/40" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name or band"
                  /* The placeholder is doing the labelling, so this repeats it
                     rather than adding a second name — a field with both is read
                     out twice. */
                  aria-label="Search by name or band"
                  className="grow"
                />
              </label>

              <select
                value={slotId}
                onChange={(event) => setSlotId(event.target.value)}
                aria-label="Filter by slot"
                className="select select-bordered bg-base-100"
              >
                <option value={ALL}>All slots</option>
                {session.slots.map((slot) => (
                  <option key={slot.slotId} value={slot.slotId}>
                    {slot.startTime}–{slot.endTime}
                  </option>
                ))}
              </select>

              <select
                value={instrument}
                onChange={(event) => setInstrument(event.target.value)}
                aria-label="Filter by instrument"
                className="select select-bordered bg-base-100"
              >
                <option value={ALL}>All instruments</option>
                {session.instrumentTemplate.map((line) => (
                  <option key={line.instrument} value={line.instrument}>
                    {line.instrument}
                  </option>
                ))}
              </select>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filter by status"
                className="select select-bordered bg-base-100"
              >
                <option value={ALL}>All statuses</option>
                <option value="confirmed">Booked</option>
                <option value="cancelled">Dropped out</option>
              </select>
            </div>

            {/* aria-live, so changing a filter is announced — the table below it
                updates silently otherwise. */}
            <p aria-live="polite" className="ml-auto text-sm tabular-nums text-base-content/60">
              {filtered
                ? `${rows.length} of ${bookings.length} shown`
                : `${bookings.length} spot${bookings.length === 1 ? '' : 's'}`}
            </p>
          </div>

          {rows.length === 0 ? (
            <p className="mt-6 rounded-box bg-base-200 p-8 text-center text-base-content/70">
              No bookings match those filters.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Musician</th>
                    <th>Band</th>
                    <th>Spot</th>
                    <th>Slot</th>
                    <th>Status</th>
                    <th>Booked</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((booking, index) => {
                    const gone = booking.status === 'cancelled';

                    return (
                      <tr key={booking.id} className={gone ? 'text-base-content/50' : ''}>
                        <td className="tabular-nums text-base-content/40">{index + 1}</td>
                        <td className={`font-bold ${gone ? 'line-through' : ''}`}>
                          {booking.musician.firstName} {booking.musician.lastName}
                        </td>
                        <td className="text-base-content/70">
                          {booking.bandName ?? (
                            <span aria-hidden className="text-base-content/30">
                              —
                            </span>
                          )}
                        </td>
                        <td className="text-base-content/70">{booking.label}</td>
                        <td className="tabular-nums text-base-content/70">
                          {booking.slotStartTime}–{booking.slotEndTime}
                        </td>
                        <td>
                          <StatusChip status={booking.status} />
                        </td>
                        <td className="tabular-nums text-base-content/50">
                          {bookedOn.format(booking.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
