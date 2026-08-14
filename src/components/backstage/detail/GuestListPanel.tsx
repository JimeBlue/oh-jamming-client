'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AiFillClockCircle } from 'react-icons/ai';
import { FaArrowLeftLong, FaMagnifyingGlass, FaRegCalendar } from 'react-icons/fa6';

import { guestGroups, type GuestGroupStatus } from '@/lib/guestList';
import { formatListingDate } from '@/lib/jamListing';
import { APP_TIMEZONE, utcMidnightToDateString } from '@/lib/time';
import { useJamDetail } from './JamDetailContext';

/* Who is playing, one row per booking.

   The API stores one document per spot; this reads one row per *submission*, so
   a trio that claimed three spots is one row three spots tall rather than three
   rows that have to be de-duplicated by eye. The grouping and everything derived
   across a group — the status, the two dates — is in `lib/guestList`.

   Cancelled bookings stay in the same table, marked, rather than in a list of
   their own. They are the record of who dropped out, and they can sit here
   safely because nothing on this screen is counted: the occupancy numbers live
   on the cockpit and read the session's spots, so a row here can never inflate
   them. */

/* Both date columns carry a time, and `Modified` is the reason: a submission
   made and then partly cancelled on the same afternoon shows the same day in
   both columns, and the column exists to say that something changed.

   Formatted in the venue's own city rather than the reader's, matching every
   other time in the app — these are real instants, so they are the values a
   timezone can move. Built once at module load. */
const stamp = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIMEZONE,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const ALL = 'all';

/* The two facts a venue needs while reading a roster — which night, and what
   time. Filled indigo rather than the tinted pills used for status, because
   these are not a state anything is in: they are the page's subject, standing in
   for the session card this route doesn't render.

   `rounded-field` rather than `rounded-full`, which is the theme's own 0.5rem
   and the same radius daisyUI gives every `.btn` — so these sit at the top of
   the page in the same shape as the header's buttons directly above them. The
   pill is left to the status badges, where the roundness is what marks them as
   labels rather than controls. */
const Fact = ({ children }: { children: React.ReactNode }) => (
  <span className="badge h-auto gap-2 rounded-field border-0 bg-primary px-4 py-2 text-sm font-bold whitespace-nowrap text-primary-content">
    {children}
  </span>
);

const Dash = () => (
  <span aria-hidden className="text-base-content/30">
    —
  </span>
);

const STATUS = {
  confirmed: { label: 'Confirmed', className: 'bg-primary/10 text-primary' },
  cancelled: { label: 'Cancelled', className: 'bg-status-taken/10 text-status-taken' },
} as const satisfies Record<GuestGroupStatus, { label: string; className: string }>;

const StatusChip = ({ status }: { status: GuestGroupStatus }) => {
  const { label, className } = STATUS[status];

  return (
    <span className={`badge h-auto border-0 px-3 py-1 font-bold whitespace-nowrap ${className}`}>
      {label}
    </span>
  );
};

export default function GuestListPanel() {
  const { session, bookings } = useJamDetail();

  const [query, setQuery] = useState('');
  const [slotId, setSlotId] = useState<string>(ALL);
  const [instrument, setInstrument] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);

  const needle = query.trim().toLowerCase();
  const groups = guestGroups(bookings);
  const when = formatListingDate(utcMidnightToDateString(session.date));

  /* Not memoised. The cap is 300 spots per session (MAX_SPOTS_PER_SESSION), so
     this is a few hundred comparisons per keystroke on an array already in
     memory — cheaper than the bookkeeping to avoid it. */
  const rows = groups.filter(
    (group) =>
      (slotId === ALL || group.slotId === slotId) &&
      /* A group matches an instrument if any spot in it does — a trio is findable
         under all three. Status is the group's own, so filtering to "Cancelled"
         returns the bookings the Status column calls cancelled and nothing else.
         Matching per spot instead would list a booking that is still coming under
         a filter for the ones that aren't. */
      (instrument === ALL || group.spots.some((spot) => spot.instrument === instrument)) &&
      (status === ALL || group.status === status) &&
      /* Name, band and address in one haystack rather than three tests, so
         "jane@" and "Jane" and "Nightowls" all reach the same rows without the
         venue having to say which kind of thing they are typing. */
      (needle === '' ||
        `${group.musician.firstName} ${group.musician.lastName} ${group.bandName ?? ''} ${group.musician.email}`
          .toLowerCase()
          .includes(needle)),
  );

  const filtered = rows.length !== groups.length;

  return (
    /* No card. The nine columns want every pixel the shell's own padding leaves,
       and a panel with its own border and 1.5rem of inset was spending 3rem of
       them on a frame around a table that is already visually one thing. */
    <section className="flex flex-col gap-5">
      {/* This route's own header, in place of the session card the other two
          wear. `h1`, not `h2`: with the card gone the page has no other heading,
          and the session it is about is the line underneath rather than the
          title — a venue that got here already knows which night they clicked. */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl">Guest list</h1>
          <p className="mt-1 text-base-content/80">{session.title}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {when && (
            <Fact>
              <FaRegCalendar aria-hidden className="size-4 shrink-0" />
              {when}
            </Fact>
          )}

          <Fact>
            <AiFillClockCircle aria-hidden className="size-4 shrink-0" />
            <span className="tabular-nums">
              {session.startTime} – {session.endTime}
            </span>
          </Fact>

          <Link
            href="/my-backstage"
            className="flex items-center gap-2 font-bold text-primary hover:text-secondary"
          >
            <FaArrowLeftLong aria-hidden className="size-4" />
            My backstage
          </Link>
        </div>
      </header>

      {bookings.length === 0 ? (
        <p className="rounded-box bg-base-100 p-8 text-center text-base-content/70">
          Nobody has booked a spot on this night yet.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
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
                  placeholder="Search by name, band or e-mail"
                  /* The placeholder is doing the labelling, so this repeats it
                     rather than adding a second name — a field with both is read
                     out twice. */
                  aria-label="Search by name, band or e-mail"
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
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
          </div>

          {/* Announced but not shown. The count came off the page, and for
              anyone reading it that would leave filtering with no feedback at
              all — the table below reshuffles silently. Sighted users watch the
              rows change; this is the same information for people who can't. */}
          <p aria-live="polite" className="sr-only">
            {filtered
              ? `${rows.length} of ${groups.length} bookings shown`
              : `${groups.length} booking${groups.length === 1 ? '' : 's'}`}
          </p>

          {rows.length === 0 ? (
            <p className="rounded-box bg-base-100 p-8 text-center text-base-content/70">
              No bookings match those filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Musician</th>
                    <th>Multiple spots</th>
                    <th>Band</th>
                    <th>Spots</th>
                    <th>Slot</th>
                    <th>Status</th>
                    <th>E-mail</th>
                    <th>Booked</th>
                    <th>Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((group) => (
                    <tr key={group.groupId} className="align-top">
                      <td className="font-bold whitespace-nowrap">
                        {group.musician.firstName} {group.musician.lastName}
                      </td>

                      <td>{group.spots.length > 1 ? 'Yes' : 'No'}</td>

                      <td className="text-base-content/70">{group.bandName ?? <Dash />}</td>

                      {/* The row is as tall as the booking is wide — one line per
                          spot, struck through where that one spot is gone. This
                          is the whole reason the table groups: a cancelled spot
                          inside a live booking has nowhere to show in a flat
                          list. */}
                      <td>
                        <ul className="flex flex-col gap-0.5">
                          {group.spots.map((spot) => (
                            <li
                              key={spot.bookingId}
                              className={
                                spot.cancelled
                                  ? 'text-base-content/40 line-through'
                                  : 'text-base-content/70'
                              }
                            >
                              {spot.label}
                            </li>
                          ))}
                        </ul>
                      </td>

                      <td className="tabular-nums whitespace-nowrap text-base-content/70">
                        {group.slotStartTime}–{group.slotEndTime}
                      </td>

                      <td>
                        <StatusChip status={group.status} />
                      </td>

                      {/* A link, because the column exists to be acted on — the
                          venue reading this is the one who has to tell everybody
                          the night moved. `break-all` so a long address wraps
                          inside its cell instead of widening the table. */}
                      <td>
                        <a
                          href={`mailto:${group.musician.email}`}
                          className="break-all text-primary hover:underline"
                        >
                          {group.musician.email}
                        </a>
                      </td>

                      <td className="tabular-nums whitespace-nowrap text-base-content/50">
                        {stamp.format(group.bookedAt)}
                      </td>

                      <td className="tabular-nums whitespace-nowrap text-base-content/50">
                        {stamp.format(group.modifiedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
