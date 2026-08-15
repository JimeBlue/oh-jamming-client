'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { FaChartSimple, FaLocationDot, FaRegCalendar, FaRegImage, FaUsers } from 'react-icons/fa6';
import { GrOverview } from 'react-icons/gr';

import musicAlbum from '@/assets/music-album.png';
import MaskIcon from '@/components/ui/MaskIcon';
import { GENRE_LABELS, SKILL_LEVEL_LABELS } from '@/config/jamOptions';
import { formatListingDate, type JamListingView } from '@/lib/jamListing';
import JamSlotList from './JamSlotList';

/* A jam session as a musician sees it.

   The same component in both places it is needed — the last step of the builder,
   where it is the venue's last look before publishing, and the page a musician
   opens to book a slot. Two drawings of one thing is how a preview quietly
   starts lying: the venue approves a layout, and what goes live is a different
   one. Everything that differs between the two is in the view model
   (`lib/jamListing`) or in whether a slot handler was passed, and nothing here
   knows which of the two it is rendering.

   The layout is the wireframe's: what the session *is* on the left — image,
   pitch, the long overview, where it happens — and what a musician has to decide
   on the right — is this my genre, my level, and which slot do I want.

   Headings start at h2. The page around it owns the h1: "Preview & publish" in
   the builder, the venue's own page furniture on the listing. */

const VenueMap = dynamic(() => import('../VenueMap'), {
  /* Leaflet touches `window` at import; see the note in VenueMap. */
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-box bg-base-200" />,
});

type JamListingProps = {
  listing: JamListingView;
  /* Passed only where slots can actually be booked. Absent, the slot list is a
     list rather than a row of controls — see JamSlotList. */
  selectedSlotId?: string | null;
  onSelectSlot?: (slotId: string) => void;
};

export default function JamListing({
  listing,
  selectedSlotId,
  onSelectSlot,
}: JamListingProps) {
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
    lineUp,
    slotDurationMinutes,
    slots,
  } = listing;

  const formattedDate = formatListingDate(date);
  const hasPin = address.lat !== undefined && address.lng !== undefined;

  return (
    /* 3/2 rather than the wireframe's even split: the right column is chips and
       a list of times, and given half a desktop page it reads as mostly empty. */
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <h2 className="font-heading text-2xl sm:text-3xl">
          {title || 'Untitled session'}
        </h2>

        {/* The frame is there whether or not a photo is, so the listing's
            proportions are the same either way — a venue approving this layout
            without a photo gets the layout they approved.

            `sizes` is what stops next/image serving a 1600px file to a phone: it
            describes the rendered width, not the source, and the left column is
            three fifths of a 56rem card once the grid kicks in. */}
        <div className="relative aspect-video w-full overflow-hidden rounded-box border border-base-300 bg-base-200">
          {image ? (
            <Image
              src={image}
              alt={title ? `${title} at ${venueName}` : 'The room this session runs in'}
              fill
              /* A blob: URL — the builder's not-yet-published photo — exists only
                 in this tab, so there is nothing for next/image's optimiser to
                 fetch. Keyed off the scheme rather than off which caller this is,
                 because that is the actual reason: the file has no server. */
              unoptimized={image.startsWith('blob:')}
              sizes="(min-width: 1024px) 34rem, (min-width: 640px) 42rem, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <FaRegImage className="size-8 opacity-30" />
              <p className="text-xs opacity-60">No photo for this session</p>
            </div>
          )}
        </div>

        {summary && <p className="text-base opacity-80">{summary}</p>}

        {overview.trim() && (
          <Section icon={<GrOverview aria-hidden className="size-5" />} title="Overview">
            {/* The stored value is markdown; `.rich-text` is what puts back the
                list markers and bold weights Tailwind's preflight strips, and
                it's the same class the editor wears so the two can't drift.
                react-markdown builds React elements rather than an HTML string,
                so there is nothing here to sanitise. */}
            <div className="rich-text mt-2 text-sm opacity-80">
              <ReactMarkdown>{overview}</ReactMarkdown>
            </div>
          </Section>
        )}

        <Section icon={<FaLocationDot aria-hidden className="size-5" />} title="Where">
          <p className="mt-2 text-sm">
            {venueName && <span className="block font-bold">{venueName}</span>}
            <span className="opacity-70">
              {address.formatted || 'Address to be confirmed'}
            </span>
          </p>

          {/* Only with a pin to show. The empty country-scale map earns its place
              under the address field, where it explains what the autocomplete is
              for; here it would be a picture of Germany under someone's address. */}
          {hasPin && (
            <div className="mt-3">
              <VenueMap lat={address.lat} lng={address.lng} label={address.formatted} />
            </div>
          )}
        </Section>
      </div>

      <aside className="space-y-4 lg:col-span-2">
        {/* The one glyph on the page that isn't from react-icons, so it is drawn
            through a mask rather than an `<img>`: the file is a black outline on
            transparency, and painting the element's own `bg-primary` through its
            alpha is what makes it indigo like every other icon here, instead of
            committing a second copy of the artwork in a colour that can't follow
            the theme. */}
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
          icon={<FaChartSimple aria-hidden className="size-5 text-brand-green-deep" />}
        >
          <ChipRow
            items={skillLevel.map((level) => ({
              label: SKILL_LEVEL_LABELS[level],
              catchAll: level === 'all-levels',
            }))}
          />
        </Panel>

        <Panel
          title="Date & time"
          icon={<FaRegCalendar aria-hidden className="size-5 text-brand-pink-deep" />}
        >
          {/* No pin or calendar of its own — the panel heading carries the mark
              now, and a second calendar two lines under the first one is the
              same thing said twice. */}
          <p className="text-sm">
            {formattedDate ?? 'Date to be confirmed'}
            {startTime && endTime && (
              <span className="block tabular-nums opacity-70">
                {startTime} – {endTime}
              </span>
            )}
          </p>

          <p className="mt-4 mb-2 text-sm font-bold">
            {onSelectSlot
              ? 'Select a time slot to book a spot'
              : slotSummary(slots.length, slotDurationMinutes)}
          </p>

          <JamSlotList
            slots={slots}
            selectedSlotId={selectedSlotId}
            onSelect={onSelectSlot}
          />
        </Panel>

        {/* The rail's own Guest list glyph. Both answer "who is in the room", so
            the venue meets the same mark on the listing and on the roster. */}
        <Panel
          title="In every slot"
          icon={<FaUsers aria-hidden className="size-5 text-primary" />}
        >
          {lineUp.length === 0 ? (
            <p className="text-sm opacity-60">No instruments yet</p>
          ) : (
            /* Two colours in one chip, because it holds two facts: what
               instrument, and how many of it. The count is the thing a musician
               scans for, so it takes the pink. */
            <ul className="flex flex-wrap gap-2">
              {lineUp.map(({ instrument, spotsTotal }) => (
                <li
                  key={instrument}
                  className="rounded-field bg-primary/10 px-3 py-1 text-sm text-primary"
                >
                  {instrument}{' '}
                  <span className="font-bold tabular-nums text-brand-pink-deep">
                    ×{spotsTotal}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </aside>
    </div>
  );
}

/* A section of the left column: the heading in a tinted disc, and everything
   under it indented past the disc so the block reads as one thing rather than as
   a title with loose text beneath it. Pink, which is the site's accent — the
   aside opposite is where the indigo lives. */
const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="flex gap-4 border-t border-base-200 pt-6">
    <span
      aria-hidden
      className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-pink-deep/15 text-brand-pink-deep"
    >
      {icon}
    </span>
    <div className="min-w-0 flex-1">
      <h3 className="font-heading text-lg">{title}</h3>
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

/* What the slot list says to someone who can't book from it. The musician's page
   asks them to pick one; the venue is being told what they built. */
const slotSummary = (count: number, durationMinutes: number): string => {
  if (count === 0) return 'Time slots';

  return `${count} slot${count === 1 ? '' : 's'} of ${durationMinutes} minutes`;
};
