'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import { BiSolidGuitarAmp } from 'react-icons/bi';
import { FaUserAlt } from 'react-icons/fa';
import {
  FaArrowLeftLong,
  FaArrowsRotate,
  FaClockRotateLeft,
  FaMagnifyingGlass,
  FaPeopleGroup,
  FaRegCalendar,
  FaRegCalendarCheck,
  FaRegClock,
  FaRegEnvelope,
  FaRegFlag,
  FaUsers,
} from 'react-icons/fa6';

import { guestGroups, type GuestGroup, type GuestGroupStatus } from '@/lib/guestList';
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
   time. Filled royal blue rather than the tinted chips used for status, because
   these are not a state anything is in: they are the page's subject, standing in
   for the session card this route doesn't render.

   `rounded-field` rather than `rounded-full`, which is the theme's own 0.5rem
   and the same radius daisyUI gives every `.btn` — so these sit at the top of
   the page in the same shape as the header's buttons directly above them. */
const Fact = ({ children }: { children: React.ReactNode }) => (
  <span className="badge h-auto gap-2 rounded-field border-0 bg-royal-blue px-4 py-2 text-sm font-bold whitespace-nowrap text-white">
    {children}
  </span>
);

const Dash = () => (
  <span aria-hidden className="text-dark-teal/30">
    —
  </span>
);

/* The musician, in the card layout: a glyph in a tinted disc with the name under
   it, in place of a "Musician:" line.

   The disc holds the same one-or-several icon the table uses in its first cell,
   not initials — initials would be a second thing to read and would say nothing
   the name beside them doesn't. `aria-hidden`, because it is decorative twice
   over: the name is right there, and how many spots there are is spelled out two
   lines down. */
const MusicianAvatar = ({ group }: { group: GuestGroup }) => {
  const Who = group.spots.length > 1 ? FaUsers : FaUserAlt;

  return (
    /* A fixed width from `sm`, which is the whole reason the rule beside it lines
       up. Sized to its content, this column is as wide as the name in it — so
       "Jane Doe" and "Marco Silva" put the divider in two different places and
       the rows stop reading as a table. `shrink-0` because a wrapping flex row
       will take it back off the widest item first. */
    <div className="flex flex-col items-center gap-2 text-center sm:w-32 sm:shrink-0">
      <span
        aria-hidden
        className="grid size-12 shrink-0 place-items-center rounded-full bg-royal-blue/10"
      >
        <Who className="size-5 text-royal-blue" />
      </span>
      <p className="text-[15px] font-bold text-dark-teal">
        {group.musician.firstName} {group.musician.lastName}
      </p>
    </div>
  );
};

/* One labelled line in the card layout. The label carries the weight because it
   is what the eye scans down; the value is the grey the table's cells use, so a
   booking reads the same either side of the `xl` switch.

   The glyph is royal blue and set against the *first* line rather than centred,
   the same treatment the header card gives its pin and clock — with six of these
   stacked, an icon drifting to the middle of a wrapped value would break the
   column they otherwise form down the left edge. */
const Field = ({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) => (
  <p className="flex items-start gap-2 text-[13px]">
    {icon}
    <span>
      <span className="font-bold text-dark-teal">{label}:</span>{' '}
      <span className="text-dark-teal/70">{children}</span>
    </span>
  </p>
);

const FIELD_ICON = 'mt-1 size-3.5 shrink-0 text-royal-blue';

/* A group's spots on one line, cancelled ones struck through. The separator sits
   *outside* the span so a cancelled spot doesn't drag the comma after it through
   the strikethrough — the table stacks these instead, where no separator is
   needed at all. */
const SpotList = ({ spots }: { spots: GuestGroup['spots'] }) => (
  <>
    {spots.map((spot, index) => (
      <Fragment key={spot.bookingId}>
        {index > 0 && ', '}
        <span className={spot.cancelled ? 'text-dark-teal/40 line-through' : ''}>
          {spot.label}
        </span>
      </Fragment>
    ))}
  </>
);

const FILTER_ICON = 'size-4 shrink-0 text-royal-blue';

/* daisyUI's `.select` as the wrapper, with the control nested — the arrangement
   that sizes correctly, since `.select` carries the width clamp and the chevron.

   The one declaration it makes that breaks a leading icon is on the nested
   control: `margin-inline: -0.75rem -1.75rem`, which pulls the select 12px left
   so it bleeds under the wrapper's own padding. That assumes the select is the
   only child; with a glyph in front, the select slides over it and paints its
   background on top — the icons were never clipped, they were covered.

   `ms-0!` cancels exactly that one side. The `!` is doing real work: the rule is
   `.select select`, an element-plus-class selector no plain utility can outrank.
   The 12px it leaves on the right is swallowed by the wrapper's `overflow:
   hidden`, and the control's own `padding-inline-end` still keeps its text clear
   of the chevron. */
const SelectField = ({
  icon,
  value,
  onChange,
  label,
  children,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: React.ReactNode;
}) => (
  /* `w-48` against daisyUI's own `clamp(3rem, 20rem, 100%)`. Three filters at
     20rem each left the search box at 203px — narrow enough to clip its own
     placeholder — and none of these ever needs 320px to say "All instruments". */
  <label className="filter-select select select-bordered w-48 gap-2 border-royal-blue/20 bg-base-100 text-dark-teal">
    {icon}
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className="ms-0!"
    >
      {children}
    </select>
  </label>
);

/* Outlined on a wash of their own colour, the shape the cockpit's slot chips and
   the session badge both wear now — so a booking that is still on and a spot
   that is still open read as one thing across the two routes. Confirmed letters
   in the page's teal rather than a green of its own: the lime edge is what says
   which state it is, and a third colour inside it would say it twice. */
const STATUS = {
  confirmed: {
    label: 'Confirmed',
    className: 'border-brand-green/50 bg-brand-green/20 text-dark-teal',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'border-status-cancelled/40 bg-status-cancelled/10 text-status-cancelled',
  },
} as const satisfies Record<GuestGroupStatus, { label: string; className: string }>;

const StatusChip = ({ status }: { status: GuestGroupStatus }) => {
  const { label, className } = STATUS[status];

  return (
    <span
      className={`badge h-auto border px-3 py-1 text-[12px] font-bold whitespace-nowrap ${className}`}
    >
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

  /* Every filter at once. Four separate clearings is the thing a venue actually
     wants after narrowing to one instrument in one slot and finding nobody. */
  const resetFilters = () => {
    setQuery('');
    setSlotId(ALL);
    setInstrument(ALL);
    setStatus(ALL);
  };

  /* Off when there is nothing to undo. `disabled:pointer-events-auto` on the
     button is what makes `cursor-not-allowed` visible at all — daisyUI kills
     pointer events on a disabled `.btn`, so the cursor never meets it. */
  const noFilters =
    query === '' && slotId === ALL && instrument === ALL && status === ALL;

  return (
    /* Three bands down the page: the header on the page background, then the
       filters, then the rows — the last two each in the lifted white panel the
       cockpit's sections use. Split by what the parts *are*: the title and the
       two facts name the page, the strip is a control panel, and the table is
       what the controls act on. */
    <section className="flex flex-col gap-5">
      {/* This route's own header, in place of the session card the other two
          wear. `h1`, not `h2`: with the card gone the page has no other heading,
          and the session it is about is the line underneath rather than the
          title — a venue that got here already knows which night they clicked. */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[23px] font-bold text-dark-teal sm:text-[29px]">
            Guest list
          </h1>
          <p className="mt-1 text-[15px] font-bold text-dark-teal">{session.title}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {when && (
            <Fact>
              <FaRegCalendar aria-hidden className="size-4 shrink-0" />
              {when}
            </Fact>
          )}

          <Fact>
            <FaRegClock aria-hidden className="size-4 shrink-0" />
            <span className="tabular-nums">
              {session.startTime} – {session.endTime}
            </span>
          </Fact>

          <Link
            href="/my-backstage"
            className="flex items-center gap-2 font-bold text-royal-blue transition-colors hover:text-dark-teal"
          >
            <FaArrowLeftLong aria-hidden className="size-4" />
            My backstage
          </Link>
        </div>
      </header>

      {bookings.length === 0 ? (
        <div className="rounded-box bg-base-100 p-4 shadow-xl sm:p-6">
          <p className="py-8 text-center text-dark-teal/60">
            Nobody has booked a spot on this night yet.
          </p>
        </div>
      ) : (
        <>
          {/* Two cards, not one. The filters are a control panel and the rows are
              the result — separating them is what says the top strip acts on the
              thing below rather than being part of it, and it keeps the table's
              own header the first line inside its own box. */}
          <div className="rounded-box bg-base-100 p-4 shadow-xl sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* The options come from the *session*, not from the bookings, so
                  every slot and every instrument is listed whether or not anyone
                  took it. Filtering to one and being told nobody is there is an
                  answer; a dropdown that quietly omits the empty ones can't give
                  it. */}
              {/* `shrink-0` on every one of these glyphs. The daisyUI `.input`
                  and `.select` wrappers are flex containers whose control grows,
                  so an SVG without it is the thing that gives way — which is
                  what was squashing the icons to a sliver. */}
              {/* The one filled field in the strip. It is the control a venue
                  reaches for first and the only one that is typed into rather
                  than picked from, and the pale ground is what says so without
                  a second border weight. */}
              <label className="input input-bordered flex min-w-48 flex-1 items-center gap-2 border-royal-blue/20 bg-pale-blue text-dark-teal">
                <FaMagnifyingGlass aria-hidden className="size-4 shrink-0 text-royal-blue" />
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

              {/* daisyUI 5 lets `.select` be the *container* with the control
                  nested inside, which is the only way to get a glyph in front of
                  a native select — an `<option>` can't hold an icon, and an
                  absolutely positioned one has to be kept clear of the chevron by
                  hand. Same shape as the search field beside it. */}
              {/* The icon sits *over* the select rather than beside it inside a
                  `.select` wrapper, which is the arrangement `.input` supports
                  and `.select` does not: daisyUI gives a nested select
                  `margin-inline: -0.75rem -1.75rem` so it bleeds under the
                  wrapper's padding, on the assumption that it is the only child.
                  With a glyph in front, the select slides 12px left and paints
                  its own background over it — the icons were not clipped, they
                  were covered.

                  So `.select` goes on the control itself, where daisyUI expects
                  it, the icon is absolutely positioned, and `pl-10` opens the
                  room. `pointer-events-none` keeps the whole field clickable. */}
              <SelectField
                icon={<FaRegCalendar aria-hidden className={FILTER_ICON} />}
                value={slotId}
                onChange={setSlotId}
                label="Filter by slot"
              >
                <option value={ALL}>All slots</option>
                {session.slots.map((slot) => (
                  <option key={slot.slotId} value={slot.slotId}>
                    {slot.startTime}–{slot.endTime}
                  </option>
                ))}
              </SelectField>

              <SelectField
                icon={<BiSolidGuitarAmp aria-hidden className={FILTER_ICON} />}
                value={instrument}
                onChange={setInstrument}
                label="Filter by instrument"
              >
                <option value={ALL}>All instruments</option>
                {session.instrumentTemplate.map((line) => (
                  <option key={line.instrument} value={line.instrument}>
                    {line.instrument}
                  </option>
                ))}
              </SelectField>

              <SelectField
                icon={<FaRegFlag aria-hidden className={FILTER_ICON} />}
                value={status}
                onChange={setStatus}
                label="Filter by status"
              >
                <option value={ALL}>All statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </SelectField>

              {/* Outlined blue in both states — off is not the same as greyed
                  out here. It reads as part of the filter strip; draining it
                  when there is nothing to reset makes the strip look
                  half-broken rather than idle, so the cursor is what reports
                  the state.

                  The colours are restated behind `disabled:` because daisyUI's
                  `.btn:is(:disabled,…)` is more specific than a plain utility and
                  would otherwise grey it. `hover:` is added conditionally rather
                  than as `enabled:hover:` — that variant loses to `.btn` on
                  background, which is what left this button grey when it was
                  live. */}
              <button
                type="button"
                onClick={resetFilters}
                disabled={noFilters}
                className={`btn ml-auto border-royal-blue bg-transparent font-bold text-royal-blue shadow-none disabled:pointer-events-auto disabled:cursor-not-allowed disabled:border-royal-blue disabled:bg-transparent disabled:text-royal-blue ${
                  noFilters ? '' : 'hover:border-royal-blue hover:bg-royal-blue hover:text-white'
                }`}
              >
                <FaArrowsRotate aria-hidden className="size-4" />
                Reset filters
              </button>
            </div>

            {/* Announced but not shown. The count came off the page, and for
                anyone reading it that would leave filtering with no feedback at
                all — the table below reshuffles silently. Sighted users watch
                the rows change; this is the same for people who can't. */}
            <p aria-live="polite" className="sr-only">
              {filtered
                ? `${rows.length} of ${groups.length} bookings shown`
                : `${groups.length} booking${groups.length === 1 ? '' : 's'}`}
            </p>
          </div>

          <div className="rounded-box bg-base-100 p-4 shadow-xl sm:p-6">
              {rows.length === 0 ? (
                <p className="py-8 text-center text-dark-teal/60">
                  No bookings match those filters.
                </p>
              ) : (
                <>
                  {/* Two layouts of the same eight fields, not one table made to
                      bend. Eight columns need roughly a laptop to be read
                      without scrolling sideways, so below `xl` each booking is a
                      block of labelled lines — the same shape the backstage
                      board's rows use, so the two venue-facing lists read alike.

                      The presentation is duplicated; the data is not. Both draw
                      the same `rows`, so the two can differ in layout and never
                      in content. */}
                  <ul className="flex flex-col xl:hidden">
                    {rows.map((group) => (
                      <li
                        key={group.groupId}
                        className="flex flex-wrap items-start gap-4 border-b border-royal-blue/10 py-6 last:border-b-0 sm:gap-5"
                      >
                        {/* `basis-64` on the fields is what decides the phone
                            layout: a wrapping flex row breaks on bases before
                            anything shrinks, so asking for 16rem there is what
                            pushes them under the name below `sm`. From `sm` it
                            becomes `basis-0` — the three take their widths from
                            the two fixed ends instead, and the row never wraps,
                            which is the other half of keeping the rule in one
                            place down the list. */}
                        <MusicianAvatar group={group} />

                        {/* The rule that makes the two a pair of columns rather
                            than two things that happen to be side by side. Only
                            once they *are* side by side: below `sm` the fields
                            wrap under the name, where a left border would be a
                            stray mark down the page. No `xl` reset needed — the
                            whole list is `xl:hidden` by then. */}
                        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2.5 sm:basis-0 sm:border-l sm:border-royal-blue/15 sm:pl-5">
                          {/* Two of these are borrowed rather than picked: the
                              amp is the instruments filter's own glyph and the
                              clock is the header's, so the same idea keeps the
                              same mark wherever it appears on the page. */}
                          <Field
                            icon={<FaPeopleGroup aria-hidden className={FIELD_ICON} />}
                            label="Band"
                          >
                            {group.bandName ?? <Dash />}
                          </Field>
                          <Field
                            icon={<BiSolidGuitarAmp aria-hidden className={FIELD_ICON} />}
                            label="Spots"
                          >
                            <SpotList spots={group.spots} />
                          </Field>
                          <Field
                            icon={<FaRegClock aria-hidden className={FIELD_ICON} />}
                            label="Slot"
                          >
                            {group.slotStartTime}–{group.slotEndTime}
                          </Field>
                          <Field
                            icon={<FaRegEnvelope aria-hidden className={FIELD_ICON} />}
                            label="E-mail"
                          >
                            <a
                              href={`mailto:${group.musician.email}`}
                              className="break-all hover:underline"
                            >
                              {group.musician.email}
                            </a>
                          </Field>
                          <Field
                            icon={<FaRegCalendarCheck aria-hidden className={FIELD_ICON} />}
                            label="Booked"
                          >
                            {stamp.format(group.bookedAt)}
                          </Field>
                          <Field
                            icon={<FaClockRotateLeft aria-hidden className={FIELD_ICON} />}
                            label="Modified"
                          >
                            {stamp.format(group.modifiedAt)}
                          </Field>
                        </div>

                        {/* No heading — the badge says "Confirmed" in words, so a
                            "Status:" in front of it would be the label twice. */}
                        <div className="sm:w-40">
                          <StatusChip status={group.status} />
                        </div>
                      </li>
                    ))}
                  </ul>

                <div className="hidden overflow-x-auto xl:block">
                    <table className="table text-[13px]">
                      <thead>
                        {/* No tint any more. The band was what separated the
                            headings from the first row; the rule under it does
                            that on its own now, and the caps and the grey are
                            enough to say these are labels rather than data —
                            same treatment as the cockpit's own table, so the two
                            venue-facing tables read alike. */}
                        {/* Colour and size on the row, not the cells: daisyUI
                            sets both on `.table thead`, and a `<tr>` with its own
                            beats what its cells would otherwise inherit. */}
                        <tr className="border-royal-blue/10 text-[11px] text-dark-teal/50">
                          <th>Musician</th>
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
                        {rows.map((group) => {
                          /* One person or several, now the only thing that says so:
                             the "Multiple spots" column is gone, and the spot list
                             two cells over is what gives the number. `FaUsers` is
                             the rail's own Guest list glyph, so the plural means
                             the same thing in both places. */
                          const Who = group.spots.length > 1 ? FaUsers : FaUserAlt;

                          return (
                            <tr key={group.groupId} className="border-royal-blue/10 align-top">
                              <td className="font-bold whitespace-nowrap text-dark-teal">
                                <span className="flex items-center gap-2">
                                  <Who
                                    aria-hidden
                                    className="size-4 shrink-0 text-base-content/40"
                                  />
                                  {group.musician.firstName} {group.musician.lastName}
                                </span>
                              </td>

                              <td className="text-dark-teal/70">{group.bandName ?? <Dash />}</td>

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
                                          ? 'text-dark-teal/40 line-through'
                                          : 'text-dark-teal/70'
                                      }
                                    >
                                      {spot.label}
                                    </li>
                                  ))}
                                </ul>
                              </td>

                              <td className="tabular-nums whitespace-nowrap text-dark-teal/70">
                                {group.slotStartTime}–{group.slotEndTime}
                              </td>

                              <td>
                                <StatusChip status={group.status} />
                              </td>

                              {/* Still a link, because the column exists to be acted on
                                  — the venue reading this is the one who has to tell
                                  everybody the night moved — but in the same grey as
                                  the data around it rather than link indigo. Nine
                                  columns of rows with one coloured column down the
                                  middle reads as an alert; the underline on hover is
                                  what says it is clickable. `break-all` so a long
                                  address wraps in its cell instead of widening the
                                  table. */}
                              <td>
                                <a
                                  href={`mailto:${group.musician.email}`}
                                  className="break-all text-dark-teal/70 hover:underline"
                                >
                                  {group.musician.email}
                                </a>
                              </td>

                              <td className="tabular-nums whitespace-nowrap text-dark-teal/50">
                                {stamp.format(group.bookedAt)}
                              </td>

                              <td className="tabular-nums whitespace-nowrap text-dark-teal/50">
                                {stamp.format(group.modifiedAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
        </>
      )}
    </section>
  );
}
