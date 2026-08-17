'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FaChevronDown, FaRegImage } from 'react-icons/fa6';

import { GENRE_LABELS, SKILL_LEVEL_LABELS } from '@/config/jamOptions';
import { formatShortDate } from '@/lib/jamListing';
import type { JamListingView } from '@/lib/jamListing';

/* Everything about the night except when it runs — the top half of the listing.
   The slots live in the cyan board below, because that is the box a musician
   acts in and this is the box they read.

   Not one card. The night's name rides its own indigo block, the photo and the
   map are their own frames, and the right column is small white panels on the
   page's pale ground — so what used to be a single white slab is a group of
   pieces that happen to be clipped together. The clip is the only thing that
   still treats them as one unit, which is why the collapse lives on the grid
   rather than on a card.

   Drawn in all three places a session is shown: the musician's page, the
   builder's last step, and the venue's Listing panel. It used to be drawn in one
   and imitated in the other two, which is the arrangement that lets a preview
   quietly stop predicting the page — the venue approves a layout and something
   else ships. Two props are all that remain of the difference: which heading
   level the title takes, and whether the spots badge is suppressed. */

const VenueMap = dynamic(() => import('../VenueMap'), {
  /* Leaflet touches `window` at import; see the note in VenueMap. */
  ssr: false,
  loading: () => (
    <div className="h-48 w-full animate-pulse rounded-box bg-base-200 lg:h-64" />
  ),
});

/* How much of the block is on screen before it is opened. Tall enough for the
   name, the photo and the start of the description — the point is to get a
   musician to the slots without a page of scrolling, not to hide the listing.

   Two values because the pieces above the fold are not the same height on a
   phone as on a desktop, and one number that suits both cuts the phone off
   mid-photo or leaves the desktop showing everything. */
const COLLAPSED = 'max-h-[34rem] lg:max-h-[39rem]';

/* The musician's page owns nothing above this, so the night's name is its h1.
   Rendered inside the builder step or the backstage panel there is already a
   page heading, and a second h1 under it is a document with two titles — so the
   whole block shifts down a level and the sections shift with it. */
type Level = 'h1' | 'h2';

const SUB_LEVEL: Record<Level, 'h2' | 'h3'> = { h1: 'h2', h2: 'h3' };

export default function JamIntroCard({
  listing,
  as = 'h1',
  cancelled = false,
}: {
  listing: JamListingView;
  as?: Level;
  /* Only to keep the spots badge off a night that isn't happening. The board
     below is where a cancelled session is actually explained. */
  cancelled?: boolean;
}) {
  const {
    title,
    summary,
    image,
    date,
    startTime,
    endTime,
    venueName,
    address,
    overview,
    genres,
    skillLevel,
    slotDurationMinutes,
    slots,
  } = listing;

  /* One disclosure for the whole block. The Overview panel had a second one of
     its own, and two of them a few centimetres apart made the shorter one read
     as the control for the longer one. */
  const [expanded, setExpanded] = useState(false);

  const Title = as;
  const sub = SUB_LEVEL[as];

  const hasPin = address.lat !== undefined && address.lng !== undefined;
  const trimmedOverview = overview.trim();

  /* Every free spot in the night, not the free slots: it is the number a
     musician is deciding against, and a session with eight slots and one spot
     left in each is not "eight left". */
  const spotsLeft = slots.reduce((total, slot) => total + slot.spotsFree, 0);

  const shortDate = formatShortDate(date);

  return (
    <>
      {/* Clipped by height rather than by rendering less of it, so opening it
          doesn't remount the map — Leaflet builds its own DOM in an effect and
          would re-request every tile in view. The cost is that the cut can land
          mid-sentence, which is what the fade below is for.

          1.65fr / 1fr rather than an even split: the right column is chips and a
          couple of paragraphs, and given half a desktop page it reads as mostly
          empty. */}
      <section
        className={`relative grid items-start gap-8 lg:grid-cols-[1.65fr_1fr] lg:gap-12 ${
          expanded ? '' : `${COLLAPSED} overflow-hidden`
        }`}
      >
        <div className="flex min-w-0 flex-col gap-8">
          {/* The night's name, on the brand's indigo. Inside the clip rather
              than above it because the title is the first thing you read, not
              something the page keeps pinned while you open the rest of it. */}
          <div className="flex flex-col gap-4 rounded-box bg-royal-blue p-6 text-white shadow-lg sm:p-8">
            <p className="flex items-center gap-2.5 font-display text-xs font-bold uppercase tracking-widest text-white/75">
              <span aria-hidden className="size-2 rounded-full bg-cyan-blue" />
              Open jam · {slotDurationMinutes}-minute slots
            </p>

            {/* "Untitled session" only ever shows in the builder, where the
                venue can still be three steps from having named it. A blank
                indigo block would read as a broken preview. */}
            <Title className="font-display text-3xl font-bold leading-tight tracking-tight text-pretty sm:text-5xl">
              {title || 'Untitled session'}
            </Title>

            {/* One line of facts with dots between them, and it wraps rather
                than truncates: on a phone this is three short strings that
                happen to be about the same night. The separators are `aria-
                hidden` spans, so a screen reader reads the facts and not the
                punctuation. */}
            <div className="flex flex-wrap items-center gap-2.5 text-sm text-white/90 sm:text-base">
              <span>{venueName}</span>
              <Dot />
              <span className="tabular-nums">
                {shortDate ? `${shortDate}, ` : ''}
                {startTime} – {endTime}
              </span>
            </div>
          </div>

          {/* The frame is there whether or not a photo is, so the listing's
              proportions don't depend on whether the venue uploaded one — a
              venue approving this layout without a photo gets the layout they
              approved.

              A fixed height rather than an aspect ratio: the collapse above is a
              height budget, and a photo that grows with the column width would
              spend a different amount of that budget at every viewport. */}
          <div className="relative h-52 w-full overflow-hidden rounded-box border border-royal-blue/15 bg-base-200 lg:h-[23rem]">
            {image ? (
              <Image
                src={image}
                alt={title ? `${title} at ${venueName}` : 'The room this session runs in'}
                fill
                /* A blob: URL — the builder's not-yet-published photo — exists
                   only in this tab, so there is nothing for next/image's
                   optimiser to fetch. Keyed off the scheme rather than off which
                   caller this is, because that is the actual reason: the file
                   has no server. */
                unoptimized={image.startsWith('blob:')}
                /* What stops next/image serving a 1600px file to a phone: it
                   describes the rendered width, not the source, and the left
                   column is roughly five eighths of a 1240px page once the grid
                   kicks in. */
                sizes="(min-width: 1024px) 44rem, 100vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                <FaRegImage className="size-8 opacity-30" />
                <p className="text-xs opacity-60">No photo for this session</p>
              </div>
            )}

            {/* Absent at zero rather than saying "0 spots left": a badge is a
                thing to act on, and a badge that says there is nothing to act on
                is worse than the plain photo. The board below still shows every
                slot booked out, which is where that belongs. */}
            {!cancelled && spotsLeft > 0 && (
              <p className="pointer-events-none absolute left-4 top-4 rounded-field bg-cyan-blue px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wide text-white">
                {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
              </p>
            )}
          </div>

          {/* The venue's pitch, at reading size and never cut: it is capped at
              500 characters upstream, so there is nothing here to hide. */}
          {summary && (
            <Block as={sub} title="Description">
              <p className="max-w-[62ch] text-base leading-relaxed text-dark-teal text-pretty sm:text-lg">
                {summary}
              </p>
            </Block>
          )}

          <Block as={sub} title="Where">
            <div className="flex flex-col gap-1">
              {venueName && (
                <p className="font-display text-lg font-bold text-dark-teal">{venueName}</p>
              )}
              {/* Dimmed against the name above it rather than made smaller —
                  this is an address someone types into a phone at a tram stop,
                  and shrinking it is the one thing that would make it harder. */}
              <p className="text-dark-teal/70">
                {address.formatted || 'Address to be confirmed'}
              </p>
            </div>

            {/* Only with a pin to show. Without coordinates this would be a
                picture of Germany under someone's street address. */}
            {hasPin && (
              <div className="mt-4">
                <VenueMap
                  lat={address.lat}
                  lng={address.lng}
                  label={address.formatted}
                  heightClass="h-48 lg:h-64"
                />
              </div>
            )}
          </Block>
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <Panel as={sub} title="Genres">
            <ChipRow items={genres.map((genre) => GENRE_LABELS[genre])} />
          </Panel>

          <Panel as={sub} title="Skill level">
            <ChipRow items={skillLevel.map((level) => SKILL_LEVEL_LABELS[level])} />
          </Panel>

          {/* Absent rather than empty when the venue wrote none — the overview is
              optional, and a panel headed "Overview" with nothing under it reads
              as something that failed to load. */}
          {trimmedOverview && (
            <Panel as={sub} title="Overview">
              {/* The stored value is markdown; `.rich-text` is what puts back the
                  list markers and bold weights Tailwind's preflight strips, and
                  it's the same class the editor wears so the two can't drift.
                  react-markdown builds React elements rather than an HTML string,
                  so there is nothing here to sanitise.

                  Uncut: the block's own clamp is what decides how much of a long
                  overview is on screen, and cutting it a second time here would
                  leave a fold that stays folded with everything else open. */}
              <div className="rich-text text-dark-teal">
                <ReactMarkdown>{trimmedOverview}</ReactMarkdown>
              </div>
            </Panel>
          )}
        </aside>

        {/* Says "there is more below" in the one place a hard cut says the
            opposite. Fading to the pale ground these blocks sit on — which the
            musician's page owns and `JamListing` brings with it, precisely so
            this gradient has the same thing to fade into in all three places.
            Out of the flow and click-through, so it can't sit between a pointer
            and the map underneath it. */}
        {!expanded && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-pale-blue to-transparent"
          />
        )}
      </section>

      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        /* Pulled up out of the page column's own gap: it belongs to the block
           above it, and at the full gap it floated between that block and the
           booking card and read as a control for neither. */
        className="-mt-4 inline-flex w-fit cursor-pointer items-center gap-2.5 rounded-field lg:-mt-7 border border-royal-blue/15 bg-base-100 px-6 py-3.5 font-display font-bold text-dark-teal transition-colors hover:border-royal-blue hover:text-royal-blue"
      >
        {expanded ? 'Show me less' : 'Show me more'}
        <FaChevronDown
          aria-hidden
          className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
    </>
  );
}

const Dot = () => (
  <span aria-hidden className="size-1 shrink-0 rounded-full bg-cyan-blue" />
);

/* A titled run of text in the left column. The heading is small, cyan and set in
   caps — it labels the block without competing with the night's name above it,
   which is the only thing on this page allowed to be loud. */
const Block = ({
  as: Heading,
  title,
  children,
}: {
  as: 'h2' | 'h3';
  title: string;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-3">
    <Heading className="font-display text-xs font-bold uppercase tracking-widest text-cyan-blue">
      {title}
    </Heading>
    {children}
  </section>
);

/* The same heading, boxed. The right column is a stack of short answers, and the
   border is what keeps three of them from reading as one long one. */
const Panel = ({
  as: Heading,
  title,
  children,
}: {
  as: 'h2' | 'h3';
  title: string;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-3.5 rounded-box border border-royal-blue/15 bg-base-100 p-6">
    <Heading className="font-display text-xs font-bold uppercase tracking-widest text-cyan-blue">
      {title}
    </Heading>
    {children}
  </section>
);

/* One colour for every chip, including the "All genres" / "All levels"
   catch-alls, which used to get the brand green for being a different kind of
   answer. They still are — the others narrow the night down and these say
   nothing is ruled out — but a lone green pill in a row of indigo ones read as
   a state rather than as a value, and the word already says which it is. */
const ChipRow = ({ items }: { items: string[] }) =>
  items.length === 0 ? (
    <p className="text-sm text-dark-teal/60">Not chosen yet</p>
  ) : (
    <ul className="flex flex-wrap gap-2">
      {items.map((label) => (
        <li
          key={label}
          className="rounded-[0.625rem] bg-royal-blue px-4 py-2 font-display text-sm font-bold text-white"
        >
          {label}
        </li>
      ))}
    </ul>
  );
