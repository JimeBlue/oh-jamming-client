'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FaChartSimple,
  FaChevronDown,
  FaLocationDot,
  FaRegImage,
} from 'react-icons/fa6';
import { GrOverview } from 'react-icons/gr';

import musicAlbum from '@/assets/music-album.png';
import MaskIcon from '@/components/ui/MaskIcon';
import { GENRE_LABELS, SKILL_LEVEL_LABELS } from '@/config/jamOptions';
import type { JamListingView } from '@/lib/jamListing';

/* Everything about the night except when it runs — the first white box on the
   detail page. The slots live in the second one, because that is the box a
   musician acts in and this is the box they read.

   Two columns: what the night looks like on the left, what they have to decide
   it against on the right. It is the wireframe's split, and it is also the
   builder preview's (`listing/JamListing`) — but not the same component, because
   the two pages now disagree about the frame around it: the preview is one card
   inside the builder's chrome with the title supplied by the step, and this sits
   under a page title of its own on indigo. What they still share is the view
   model, which is the part that has to agree. */

const VenueMap = dynamic(() => import('../VenueMap'), {
  /* Leaflet touches `window` at import; see the note in VenueMap. */
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-box bg-base-200" />,
});

/* How much of the card is on screen before it is opened. Tall enough for the
   photo, the pitch and the first two panels — the point is to get a musician to
   the slots without a page of scrolling, not to hide the listing. */
const COLLAPSED_CARD = 'max-h-[30rem]';

export default function JamIntroCard({ listing }: { listing: JamListingView }) {
  const { title, summary, image, venueName, address, overview, genres, skillLevel } =
    listing;

  /* One disclosure for the whole card. The Overview panel had a second one of
     its own, and two of them a few centimetres apart made the shorter one read
     as the control for the longer one. */
  const [cardExpanded, setCardExpanded] = useState(false);

  const hasPin = address.lat !== undefined && address.lng !== undefined;
  const trimmedOverview = overview.trim();

  return (
    <section className="rounded-box bg-base-100 p-6 text-base-content shadow-lg sm:p-8">
      {/* 3/2 rather than an even split: the right column is chips and a couple of
          paragraphs, and given half a desktop page it reads as mostly empty.

          Clipped by height rather than by rendering less of it, so opening the
          card doesn't remount the map — Leaflet builds its own DOM in an effect
          and would re-request every tile in view. The cost is that the cut can
          land mid-sentence, which is what the fade below is for. */}
      <div
        className={`relative grid gap-8 lg:grid-cols-5 ${
          cardExpanded ? '' : `${COLLAPSED_CARD} overflow-hidden`
        }`}
      >
        <div className="space-y-6 lg:col-span-3">
          {/* The frame is there whether or not a photo is, so the card's
              proportions don't depend on whether the venue uploaded one.

              `sizes` is what stops next/image serving a 1600px file to a phone:
              it describes the rendered width, not the source, and the left
              column is three fifths of a 56rem card once the grid kicks in. */}
          <div className="relative aspect-video w-full overflow-hidden rounded-box border border-base-300 bg-base-200">
            {image ? (
              <Image
                src={image}
                alt={`${title} at ${venueName}`}
                fill
                sizes="(min-width: 1024px) 34rem, (min-width: 640px) 42rem, 100vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                <FaRegImage className="size-8 opacity-30" />
                <p className="text-xs opacity-60">No photo for this session</p>
              </div>
            )}
          </div>

          {/* The venue's pitch, at reading size and never cut: it is capped at
              500 characters upstream, so there is nothing here to hide. */}
          {summary && <p className="leading-relaxed">{summary}</p>}

          <Section icon={<FaLocationDot aria-hidden className="size-6" />} title="Where">
            <p className="mt-2 text-sm">
              {venueName && <span className="block font-bold">{venueName}</span>}
              {/* The weight above is what separates the two lines now — nothing
                  here is dimmed, so an address is as readable as the name. */}
              <span>{address.formatted || 'Address to be confirmed'}</span>
            </p>

            {/* Only with a pin to show. Without coordinates this would be a
                picture of Germany under someone's street address. */}
            {hasPin && (
              <div className="mt-3">
                <VenueMap lat={address.lat} lng={address.lng} label={address.formatted} />
              </div>
            )}
          </Section>
        </div>

        <aside className="space-y-4 lg:col-span-2">
          {/* The one glyph on the page that isn't from react-icons, so it is
              drawn through a mask rather than an `<img>`: the file is a black
              outline on transparency, and painting the element's own
              `bg-primary` through its alpha is what makes it indigo like every
              other icon here. */}
          <Panel
            title="Genres"
            icon={<MaskIcon src={musicAlbum.src} className="size-5 bg-primary" />}
          >
            <ChipRow
              items={genres.map((genre) => ({
                label: GENRE_LABELS[genre],
                catchAll: genre === 'all-genres',
              }))}
            />
          </Panel>

          <Panel
            title="Skill level"
            icon={<FaChartSimple aria-hidden className="size-5 text-primary" />}
          >
            <ChipRow
              items={skillLevel.map((level) => ({
                label: SKILL_LEVEL_LABELS[level],
                catchAll: level === 'all-levels',
              }))}
            />
          </Panel>

          {/* Absent rather than empty when the venue wrote none — the overview is
              optional, and a panel headed "Overview" with nothing under it reads
              as something that failed to load. */}
          {trimmedOverview && (
            <Panel title="Overview" icon={<GrOverview aria-hidden className="size-5 text-primary" />}>
              {/* The stored value is markdown; `.rich-text` is what puts back the
                  list markers and bold weights Tailwind's preflight strips, and
                  it's the same class the editor wears so the two can't drift.
                  react-markdown builds React elements rather than an HTML string,
                  so there is nothing here to sanitise.

                  Uncut: the card's own clamp is what decides how much of a long
                  overview is on screen, and cutting it a second time here would
                  leave a fold that stays folded with the card wide open. */}
              <div className="rich-text text-sm">
                <ReactMarkdown>{trimmedOverview}</ReactMarkdown>
              </div>
            </Panel>
          )}
        </aside>

        {/* Says "there is more below" in the one place a hard cut says the
            opposite. Out of the flow and click-through, so it can't sit between
            a pointer and the map underneath it. */}
        {!cardExpanded && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-base-100 to-transparent"
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setCardExpanded((open) => !open)}
        aria-expanded={cardExpanded}
        className="mt-6 inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        <FaChevronDown
          aria-hidden
          className={`size-3.5 transition-transform ${cardExpanded ? 'rotate-180' : ''}`}
        />
        {cardExpanded ? 'Show me less' : 'Show me more'}
      </button>
    </section>
  );
}

/* A section of the left column: the glyph in the margin, and everything under it
   indented past that glyph so the block reads as one thing rather than as a
   title with loose text beneath it.

   The box around the glyph is the glyph's own size now that there is no disc to
   fill: any larger and it centres a 24px pin in a 40px square, which puts it
   half a line below the heading it belongs to and pushes the whole block right
   for no reason. */
const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="flex gap-3 border-t border-base-200 pt-6">
    {/* `mt-0.5` rather than a line-height guess: the heading is 18px on a 28px
        line, so its cap sits two pixels below the top of a 24px glyph. */}
    <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center text-primary">
      {icon}
    </span>
    <div className="min-w-0 flex-1">
      {/* Space Grotesk, like the jam's own name above it. Changa One has one
          weight and no lowercase restraint — it names a page, and this is a
          label inside a card. */}
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {children}
    </div>
  </section>
);

const Panel = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="rounded-box border border-base-300 p-4">
    {/* No `opacity` on the row: it would take the icon down with it, and these
        glyphs are meant to be at full strength. The label is small and uppercase
        already — that is enough to make it a label without also draining it. */}
    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
      {icon}
      {title}
    </h3>
    {children}
  </section>
);

/* `catchAll` is the "All genres" / "All levels" option, and it gets the brand
   green because it is a different kind of answer: the others narrow the night
   down, and this one says nothing is being ruled out. Read off the stored value
   rather than the label, so translating the copy can't quietly turn the colour
   off. */
const ChipRow = ({ items }: { items: { label: string; catchAll: boolean }[] }) =>
  items.length === 0 ? (
    <p className="text-sm opacity-60">Not chosen yet</p>
  ) : (
    <ul className="flex flex-wrap gap-2">
      {items.map(({ label, catchAll }) => (
        <li
          key={label}
          className={`rounded-field px-3 py-1 text-sm font-bold ${
            catchAll ? 'bg-brand-green text-base-content' : 'bg-primary text-primary-content'
          }`}
        >
          {label}
        </li>
      ))}
    </ul>
  );
