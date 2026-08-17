'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaGuitar, FaLocationDot, FaMicrophoneLines, FaRegClock } from 'react-icons/fa6';

import { jamReport } from '@/lib/jamReport';
import { jamStatus } from '@/lib/jamStatus';
import type { JamSession } from '@/schemas/jamSession';
import { getJamCities, getJamSessions } from '@/services/jamSessions';

/* The cyan band under the search: what is actually on the board tonight.

   Every number here is counted from the API rather than written into the file.
   That is the whole point of the section — it is the page's one claim about how
   busy the platform is, and a hardcoded "218 open spots" is a claim that was
   false the first time somebody booked one. It also can't be checked by anyone
   reading the page, which is the kind of wrong that survives for months.

   Two requests, both public and both already made elsewhere in the app: the
   upcoming board, and the cities the filter offers. The cities come from their
   own endpoint rather than being read off the sessions, because the API parses
   them out of the free-text address and is the authority — counting them here
   would quietly disagree with the dropdown on `/jams`. */

type Stats = {
  openSpots: number;
  jamsTonight: number;
  cities: number;
  /* The commonest slot length on the board, not an average: slot lengths are a
     handful of round numbers a venue picks from, and the mean of 15 and 30 is
     20 minutes — a number no session on the board actually runs. */
  typicalSlotMinutes: number;
  instrumentTypes: number;
};

type TonightState =
  | { status: 'loading' }
  /* No `error` variant with a message, unlike every list in the app. There is
     nothing here for a musician to do about a failure and nothing they came for:
     the section is an advertisement for the board, so a broken one is better
     gone than apologising. Same for an empty board — a band boasting about zero
     spots is worse than no band. */
  | { status: 'hidden' }
  | { status: 'ready'; stats: Stats };

/* The commonest value, ties broken by the first one seen. */
const mode = (values: readonly number[]): number | null => {
  const counts = new Map<number, number>();

  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

  let best: number | null = null;

  for (const [value, count] of counts) {
    if (best === null || count > (counts.get(best) ?? 0)) best = value;
  }

  return best;
};

const summarise = (sessions: readonly JamSession[], cities: number): Stats | null => {
  if (sessions.length === 0) return null;

  const typicalSlotMinutes = mode(sessions.map(({ slotDurationMinutes }) => slotDurationMinutes));

  return {
    /* Through `jamReport` rather than summed here. There is no availability
       counter anywhere in the model — only spots carrying a booking id — and a
       second implementation of that sum is a second answer waiting to disagree
       with the one every card and cockpit shows. */
    openSpots: sessions.reduce((total, session) => total + jamReport(session).free, 0),
    jamsTonight: sessions.filter((session) => jamStatus(session) === 'today').length,
    cities,
    typicalSlotMinutes: typicalSlotMinutes ?? 0,
    /* What venues are actually asking for, across the board — the template is
       what the venue chose, so this is the answer to "what could I turn up
       with?" rather than to "what is still free?". */
    instrumentTypes: new Set(
      sessions.flatMap(({ instrumentTemplate }) =>
        instrumentTemplate.map(({ instrument }) => instrument.toLowerCase()),
      ),
    ).size,
  };
};

export default function HomeTonight() {
  const [state, setState] = useState<TonightState>({ status: 'loading' });

  useEffect(() => {
    /* Flipped by the cleanup, so navigating away mid-flight doesn't set state on
       an unmounted component. */
    let active = true;

    Promise.all([getJamSessions(), getJamCities()])
      .then(([sessions, cities]) => {
        if (!active) return;

        const stats = summarise(sessions, cities.length);

        setState(stats ? { status: 'ready', stats } : { status: 'hidden' });
      })
      .catch(() => {
        if (active) setState({ status: 'hidden' });
      });

    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'hidden') return null;

  return (
    <section
      aria-labelledby="home-tonight-heading"
      className="bg-cyan-blue px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8"
    >
      {/* Stacked until `lg`, two columns above it. The tiles go under the copy
          rather than beside it at tablet width because they are a 2×2 grid: side
          by side they get half the row each, and four numbers in a column that
          narrow wrap their own labels. */}
      <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        {state.status === 'loading' ? <CopySkeleton /> : <Copy stats={state.stats} />}

        <ul className="grid gap-4 sm:grid-cols-2">
          {state.status === 'loading'
            ? [0, 1, 2, 3].map((key) => <TileSkeleton key={key} />)
            : tiles(state.stats).map(({ icon, value, label }) => (
                <Tile key={label} icon={icon} value={value} label={label} />
              ))}
        </ul>
      </div>
    </section>
  );
}

const Copy = ({ stats }: { stats: Stats }) => (
  <div>
    <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white/80">
      Tonight in your city
    </p>

    {/* Two headings rather than one with the number interpolated. "0 open spots
        waiting for someone to take them" is the sentence a fully booked board
        would produce, and it reads as a bug — the honest version of a full board
        is that it is full. */}
    <h2
      id="home-tonight-heading"
      className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]"
    >
      {stats.openSpots > 0 ? (
        <>
          <span className="tabular-nums">{stats.openSpots}</span> open spots waiting
          for someone to take them.
        </>
      ) : (
        <>Every spot on the board is taken — for now.</>
      )}
    </h2>

    <p className="mt-5 max-w-xl text-white/90 sm:text-lg">
      Sessions run every night across{' '}
      <span className="tabular-nums">{stats.cities}</span>{' '}
      {stats.cities === 1 ? 'city' : 'cities'}, from quiet living-room jams to full
      stage nights. Most slots are{' '}
      <span className="tabular-nums">{stats.typicalSlotMinutes}</span> minutes, and you
      only need to bring one instrument you can play.
    </p>

    {/* White fill inverting to an outline on hover, the same move the search
        button makes — and the border is there at rest in the fill's own colour,
        so gaining a visible edge doesn't change the button's size.

        Full width until `lg`, where the column stops being the page. */}
    <Link
      href="/jams"
      className="btn mt-8 h-12 w-full border-white bg-white px-8 font-display text-base font-bold text-cyan-blue shadow-none transition-colors hover:border-white hover:bg-transparent hover:text-white lg:w-auto"
    >
      Find your best jam
    </Link>
  </div>
);

/* The four numbers. A plain array rather than four hand-written tiles, because
   the only thing that differs between them is the three values. */
const tiles = (stats: Stats) => [
  { icon: <FaLocationDot />, value: String(stats.cities), label: 'cities' },
  { icon: <FaMicrophoneLines />, value: String(stats.jamsTonight), label: 'jams tonight' },
  {
    icon: <FaRegClock />,
    value: `${stats.typicalSlotMinutes} min`,
    label: 'typical slot',
  },
  { icon: <FaGuitar />, value: String(stats.instrumentTypes), label: 'instrument types' },
];

const Tile = ({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) => (
  /* A white wash rather than a second colour: the band is one flat cyan, and
     anything with a hue of its own on top of it becomes a third brand colour
     that has to be defended everywhere else.

     One layout at every width: icon and number on a line, the word under them.
     Stacking the icon above its number gives a desktop tile two rows of air
     between three short things, and the box reads as mostly empty — the number
     is the content, so the tile should be no taller than the number needs. */
  <li className="flex items-center gap-4 rounded-box bg-white/15 p-5 lg:gap-5 lg:p-6">
    <span
      aria-hidden
      className="grid size-10 shrink-0 place-items-center rounded-box bg-white/15 text-lg lg:size-12 lg:text-xl"
    >
      {icon}
    </span>

    <div className="min-w-0">
      <p className="font-display text-2xl font-bold tabular-nums lg:text-3xl">{value}</p>
      <p className="text-sm text-white/80">{label}</p>
    </div>
  </li>
);

/* Placeholders rather than an empty band or a spinner. The numbers arrive in one
   round-trip and the section's whole shape is known before they do, so the
   honest thing to hold is the space they will occupy — a spinner would be a
   loading state for a page nobody is waiting on. */
const CopySkeleton = () => (
  <div aria-hidden className="animate-pulse">
    <div className="h-4 w-40 rounded-full bg-white/25" />
    <div className="mt-5 h-9 w-full rounded-box bg-white/25 sm:h-11" />
    <div className="mt-3 h-9 w-3/4 rounded-box bg-white/25 sm:h-11" />
    <div className="mt-6 h-4 w-full rounded-full bg-white/20" />
    <div className="mt-3 h-4 w-5/6 rounded-full bg-white/20" />
    <div className="mt-8 h-12 w-full rounded-box bg-white/25 lg:w-52" />
  </div>
);

const TileSkeleton = () => (
  <li aria-hidden className="h-[6.5rem] animate-pulse rounded-box bg-white/15 lg:h-28" />
);
