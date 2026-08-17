'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { FaArrowLeft } from 'react-icons/fa6';

import { GENRE_LABELS, SKILL_LEVEL_LABELS } from '@/config/jamOptions';
import { formatListingDate } from '@/lib/jamListing';
import {
  bookingReference,
  isCyanCard,
  toBookingCard,
  toBookingCards,
  type BookingCardView,
} from '@/lib/myBookings';
import type { Booking } from '@/schemas/booking';
import type { JamSession } from '@/schemas/jamSession';
import { ApiError } from '@/services/api';
import { getMyBookings } from '@/services/bookings';
import { getJamSession } from '@/services/jamSessions';
import CancelBookingDialog from './CancelBookingDialog';
import Perforation from './Perforation';
import RescheduleDialog from './RescheduleDialog';

/* One booking, in full: the QR to present at the door, what was claimed, and
   where to turn up.

   Two requests, and only the first one is load-bearing. `GET /bookings` is the
   same unfiltered call the list makes — there is no endpoint that fetches one
   group, and the response is a musician's own bookings, so filtering client-side
   costs nothing worth avoiding. The session is fetched second, for the genres,
   the skill levels and the map pin: none of those are in the bookings
   projection, and none of them are the reason anyone opened this page. So a
   failure there drops those two panels and leaves the ticket standing.

   Client-side because the session cookie lives on the API's domain — the same
   reason every authenticated view in this app is. */

const VenueMap = dynamic(() => import('@/components/jams/VenueMap'), {
  /* Leaflet touches `window` at import; see the note in VenueMap. */
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-box bg-pale-blue" />,
});

type DetailsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'missing' }
  | {
      status: 'ready';
      card: BookingCardView;
      booking: Booking;
      /* Where this booking sits in the list the musician just came from, which
         is the only thing the ticket's colour depends on. Worked out from the
         same `toBookingCards` the list uses rather than passed through the URL —
         a colour in a query string is a colour that can be wrong. */
      index: number;
      /* Every spot in the group, which is the one thing the card view model
         doesn't carry: it holds the venue's *labels*, and the reschedule flow
         has to name spots by id — to pre-select them, to leave them selectable
         while they are booked by this musician, and to put them back if the new
         selection fails. */
      spotIds: string[];
      /* Absent when `/jam-sessions/:id` failed or hasn't answered yet. Every
         panel that reads it is conditional on it. */
      session?: JamSession;
    };

const asMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

/* The white panels the page is built from. `bg-base-100` on the design's pale
   blue ground, which is what makes them read as cards rather than as sections
   of one long sheet. */
const Panel = ({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <section className={`rounded-box bg-base-100 p-6 shadow-sm sm:p-7 ${className}`}>
    {children}
  </section>
);

/* Label above value, the same pairing the list card uses. Two tones because the
   page has two grounds: teal on the white panels, white on the cyan ticket. The
   label is held back from its ground either way, so the value it names is the
   thing read first. */
const Field = ({
  label,
  tone = 'dark',
  className = '',
  children,
}: {
  label: string;
  tone?: 'dark' | 'light';
  className?: string;
  children: React.ReactNode;
}) => (
  /* `min-w-0` because a grid item's default `min-width: auto` refuses to shrink
     below its content — which on a phone let the chip rows run past the edge of
     the panel instead of wrapping inside it. */
  <div className={`min-w-0 ${className}`}>
    {/* `font-medium` rather than the default weight: at this size on a pale
        ground the labels were thin enough to read as a caption under the value
        above them rather than as a heading over the value below. Held back by
        colour, not by weight — the value is still the thing read first. */}
    <p
      className={`text-xs font-medium ${
        tone === 'light' ? 'text-white/70' : 'text-dark-teal/60'
      }`}
    >
      {label}
    </p>
    <div className="mt-1">{children}</div>
  </div>
);

/* Pale blue ground in both cases; the ink is what separates them. Spots are what
   this musician claimed — the booking itself — and wear the royal blue the
   buttons use. Genres and levels describe the night rather than the booking, and
   wear cyan.

   Same shape either way, because they are the same kind of fact: a short tag on
   a list. Two colours is a distinction worth one glance; two shapes would be a
   distinction that has to be learned. */
const Chips = ({ items, tone }: { items: string[]; tone: 'royal' | 'cyan' }) => (
  <ul className="flex flex-wrap gap-2">
    {items.map((item, index) => (
      /* Index in the key because the spot labels are the venue's own wording and
         nothing guarantees they are distinct — the same tiebreak the list card
         uses, for the same reason. */
      <li
        key={`${item}-${index}`}
        className={`rounded-field bg-pale-blue px-3 py-1.5 text-sm font-medium ${
          tone === 'cyan' ? 'text-cyan-blue' : 'text-royal-blue'
        }`}
      >
        {item}
      </li>
    ))}
  </ul>
);

export default function BookingDetails({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [state, setState] = useState<DetailsState>({ status: 'loading' });

  /* Bumped to re-run the fetch below. A counter rather than lifting the request
     out into a callback: the effect already owns the cancellation flag that
     keeps a late response from writing to an unmounted component, and pulling
     the request out would mean maintaining that in two places. */
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  /* Where the page goes when the reschedule flow finishes.

     It nearly always goes somewhere: this flow cancels and re-creates, so a
     successful change hands back a *different* groupId and the URL in the
     address bar now names a cancelled booking. Replacing rather than pushing —
     the old id is not a place worth having in the back button. Same id back
     means nothing was written, and a refetch is all that's owed. */
  const afterReschedule = useCallback(
    (nextGroupId: string) => {
      if (nextGroupId === groupId) {
        reload();

        return;
      }

      router.replace(`/my-bookings/${encodeURIComponent(nextGroupId)}`);
    },
    [groupId, reload, router],
  );

  useEffect(() => {
    let active = true;

    getMyBookings()
      .then((bookings) => {
        if (!active) return;

        const rows = bookings.filter((booking) => booking.groupId === groupId);
        const [first] = rows;

        /* The list, built exactly as `/my-bookings` builds it — same grouping,
           same filter, same sort — so this booking's position in it is the
           position it had on the page that linked here, and the ticket keeps the
           colour the card was wearing when it was tapped.

           `toBookingCard` is the fallback for the one case the list can't
           answer: a cancelled booking superseded by a live one is filtered out
           of the list by design, and is still a perfectly valid thing to open by
           its own URL. It gets index 0, which is cyan. */
        const cards = toBookingCards(bookings);
        const found = cards.findIndex((entry) => entry.groupId === groupId);
        const index = found === -1 ? 0 : found;
        const card = cards[found] ?? toBookingCard(rows);

        /* A groupId that isn't in the response is either somebody else's or
           nothing at all, and this page cannot tell the two apart — the API
           scopes the list to the session cookie, so another musician's booking
           arrives here as an empty filter rather than as a 403. "Not found" is
           the honest answer to both. */
        if (!card || !first) {
          setState({ status: 'missing' });

          return;
        }

        setState({
          status: 'ready',
          card,
          booking: first,
          index,
          spotIds: rows.map(({ spotId }) => spotId),
        });

        /* Second, and separately: the ticket is already drawable. Anything this
           adds is detail around it, so it neither blocks the render nor takes it
           down — a caught failure simply leaves `session` undefined. */
        getJamSession(card.jamSessionId)
          .then((session) => {
            if (!active) return;

            setState((current) =>
              current.status === 'ready' ? { ...current, session } : current,
            );
          })
          .catch(() => {});
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: asMessage(error) });
      });

    return () => {
      active = false;
    };
  }, [groupId, reloadKey]);

  if (state.status === 'loading') {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-cyan-blue" />
        <span className="sr-only">Loading your booking</span>
      </div>
    );
  }

  if (state.status === 'error' || state.status === 'missing') {
    return (
      <Panel>
        <p role="alert" className="text-sm text-base-content">
          {state.status === 'missing'
            ? "We couldn't find that booking. It may have been made with a different account."
            : state.message}
        </p>
        <Link href="/my-bookings" className="btn btn-primary mt-6 font-bold">
          Back to my bookings
        </Link>
      </Panel>
    );
  }

  return (
    <BookingDetailsView
      {...state}
      onRescheduled={afterReschedule}
      /* Back to the list rather than staying here. This page draws a ticket and
         has nowhere to say "cancelled" — the card in the list does, in words, on
         a badge — so leaving them on an unchanged-looking ticket would be the
         page disagreeing with what just happened. `replace`, because the ticket
         they just gave up is not a place the back button should return to. */
      onCancelled={() => router.replace('/my-bookings')}
    />
  );
}

/* The drawing, with no idea where any of it came from. Split out so the layout
   can be exercised against fixtures — this page needs a musician login and a
   real booking, which makes "does the ticket wrap correctly on a phone" an
   expensive question to ask of the fetching version. */
export function BookingDetailsView({
  card,
  booking,
  session,
  index,
  spotIds = [],
  onRescheduled,
  onCancelled,
}: {
  card: BookingCardView;
  booking: Booking;
  session?: JamSession;
  index: number;
  spotIds?: string[];
  /* Both absent when this is drawn from fixtures, which is what leaves the two
     actions inert there: each flow needs somewhere to send the page afterwards,
     and neither leaves the booking where it was, so there is no sensible
     no-op. */
  onRescheduled?: (groupId: string) => void;
  onCancelled?: () => void;
}) {
  const address = session?.address;
  const hasPin = address?.lat !== undefined && address?.lng !== undefined;
  const cyan = isCyanCard(index);

  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  /* Decision 6: no actions on a night that has already happened or has been
     called off. The API has no date rule on cancelling — `cancelOne` checks the
     status and nothing else — so on past bookings this check is the only thing
     standing between a musician and cancelling a gig they already played. */
  const live = card.status === 'confirmed';
  const canReschedule = live && onRescheduled !== undefined;
  const canCancel = live && onCancelled !== undefined;

  return (
    <div className="space-y-5">
      {/* Back to the list, not `router.back()`: this page is reachable from a
          bookmark and from the address bar — someone at a door reloads — and
          history in those cases points anywhere. */}
      {/* More room under the heading than the `space-y-5` between the panels
          below it. It is the page's title, not the first of a stack of equal
          things, and at the same spacing as everything else it read as a label
          stuck to the top of the ticket.

          It has to clear 20px to do anything at all: this margin and the
          `space-y-5` the list puts on the ticket are adjacent sibling margins,
          so they collapse to the larger of the two rather than adding up. `mb-4`
          was invisible for exactly that reason. */}
      <div className="mb-8 flex items-center gap-4">
        {/* No button chrome — it sits beside a heading, not in a toolbar, and a
            filled circle there reads as the page's main control. Colour is the
            whole affordance, so it needs a focus ring of its own: without the
            button's, a keyboard user would have nothing to see. */}
        <Link
          href="/my-bookings"
          aria-label="Back to my bookings"
          className="rounded-field p-1 text-dark-teal transition-colors hover:text-cyan-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-blue"
        >
          <FaArrowLeft aria-hidden className="size-6" />
        </Link>
        <h1 className="font-display text-3xl font-bold text-dark-teal sm:text-4xl">
          Booking Details
        </h1>
      </div>

      {/* The hero ticket: the same two-part silhouette as the list card, with the
          QR on the stub where the date was, and the same colour the card had in
          the list — tapping a royal blue ticket and landing on a cyan one reads
          as having opened somebody else's booking. */}
      <article className="flex flex-col items-stretch sm:flex-row">
        <div
          className={`min-w-0 flex-1 rounded-t-[var(--radius-box)] p-6 text-white shadow-md sm:rounded-tr-none sm:rounded-l-[var(--radius-box)] sm:p-7 ${
            cyan ? 'bg-cyan-blue' : 'bg-royal-blue'
          }`}
        >
          {/* One grid, so Date lines up under Name at every width — two stacked
              rows measured their columns separately and put the two right-hand
              values in different places. */}
          <div className="grid gap-y-5 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-6">
            <Field label="Name" tone="light">
              <p className="text-xl font-bold sm:text-2xl">
                {booking.musician.firstName} {booking.musician.lastName}
              </p>
            </Field>

            <Field label="Booking ID" tone="light">
              <p className="text-xl font-bold tabular-nums sm:text-2xl">
                {bookingReference(card.groupId)}
              </p>
            </Field>

            <Field label="Date" tone="light">
              <p className="font-medium">{formatListingDate(card.date) ?? card.date}</p>
            </Field>

            {/* Only when there is one — most bookings are one person, and an
                empty "Band" label reads as a band they forgot to name. */}
            {card.bandName && (
              <Field label="Band" tone="light">
                <p className="font-medium">{card.bandName}</p>
              </Field>
            )}
          </div>
        </div>

        {/* The QR stub. On a phone it sits under the ticket rather than beside
            it: a code narrow enough to fit a 96px column beside four fields is
            too small to scan, which is the one thing it has to be. */}
        <div className="relative flex shrink-0 items-center justify-center rounded-b-[var(--radius-box)] bg-base-100 p-6 shadow-[0_6px_14px_-4px_rgb(0_0_0_/_0.14)] sm:w-48 sm:rounded-b-none sm:rounded-r-[var(--radius-box)] sm:shadow-[6px_0_14px_-4px_rgb(0_0_0_/_0.14)]">
          {/* The notches, on whichever edge the seam is at this width — the
              horizontal pair on a phone, the vertical pair from `sm` up. Painted
              the page's colour and pulled half outside the ticket, the same
              trick and the same caveat as the list card: they are holes only on
              `bg-pale-blue`. */}
          <span
            aria-hidden
            className="absolute top-0 left-0 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pale-blue"
          />
          <span
            aria-hidden
            className="absolute top-0 right-0 size-5 translate-x-1/2 -translate-y-1/2 rounded-full bg-pale-blue sm:hidden"
          />
          <span
            aria-hidden
            className="absolute bottom-0 left-0 size-5 -translate-x-1/2 translate-y-1/2 rounded-full bg-pale-blue"
          />

          {/* The tear line, drawn twice because the seam turns at `sm`:
              horizontal across the top on a phone, vertical down the left edge
              from there up. Same component as the list card, so the two tickets
              cannot end up with different perforations. */}
          <Perforation orientation="horizontal" className="inset-x-3 -top-1 sm:hidden" />
          <Perforation
            orientation="vertical"
            className="inset-y-3 -left-1 hidden sm:block"
          />

          {/* White ground and a quiet zone around it, both of which a scanner
              needs. `level="M"` corrects up to ~15% obscured, which is what lets
              a code survive being photographed off a phone screen at a door. */}
          <div className="w-full max-w-40 bg-white sm:max-w-none">
            <QRCode
              value={booking.qrCode}
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              level="M"
            />
          </div>
        </div>
      </article>

      {/* What was claimed, and who it is for. Side by side once there is room,
          because neither half fills a desktop column on its own. */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="space-y-5">
          <Field label="Time slot">
            <p className="font-display text-2xl font-bold tabular-nums text-dark-teal sm:text-3xl">
              {card.startTime} – {card.endTime}
            </p>
          </Field>

          <Field label="Spots">
            <Chips items={card.spots} tone="royal" />
          </Field>
        </Panel>

        {/* Dropped whole rather than shown empty: this panel is entirely the
            session's, so without it there is nothing to label. */}
        {session && (
          <Panel className="space-y-5">
            <Field label="Genres">
              <Chips
                items={session.genres.map((genre) => GENRE_LABELS[genre])}
                tone="cyan"
              />
            </Field>

            <Field label="Skill level">
              <Chips
                items={session.skillLevel.map((level) => SKILL_LEVEL_LABELS[level])}
                tone="cyan"
              />
            </Field>
          </Panel>
        )}
      </div>

      <Panel className="space-y-6">
        {/* 40/60 rather than even halves, and the same split on both rows so the
            two columns line up down the panel. The right-hand cells are the long
            ones — a session title that wraps, and a map that wants every pixel —
            while a venue name and two lines of address do not. */}
        <div className="grid gap-6 sm:grid-cols-[3fr_7fr] sm:gap-x-10">
          <Field label="Venue">
            <p className="font-display text-xl font-bold text-dark-teal">
              {card.venueName}
            </p>
          </Field>

          <Field label="Jam session">
            <p className="font-display text-xl font-bold text-dark-teal">
              {card.title}
            </p>
          </Field>
        </div>

        {(card.addressLines.length > 0 || hasPin) && (
          <>
            <hr className="border-pale-blue" />

            <div className="grid gap-6 sm:grid-cols-[3fr_7fr] sm:gap-x-10">
              {card.addressLines.length > 0 && (
                <Field label="Address">
                  {card.addressLines.map((line) => (
                    <p key={line} className="font-bold text-dark-teal">
                      {line}
                    </p>
                  ))}
                </Field>
              )}

              {/* Only with a pin to show. A country-scale map of Germany under
                  somebody's street address answers a question nobody asked. */}
              {hasPin && (
                <VenueMap
                  lat={address?.lat}
                  lng={address?.lng}
                  label={address?.formatted}
                />
              )}
            </div>
          </>
        )}
      </Panel>

      <Panel>
        {/* `h-12` rather than daisyUI's default 2.5rem. Stacked on a phone these
            are the page's only controls and they sit under a screenful of
            reading, so they have to look like the thing to press — and 40px is
            under the 44px a thumb is usually given. Kept at every width: the row
            on desktop was thin for the same reason, it was just less obvious
            next to a map.

            `sm:flex-1`, never a bare `flex-1`. It is there to make the three
            equal *widths* in the desktop row — but on a phone this is a column,
            so `flex: 1 1 0%` applies to the main axis, which is now height: the
            basis of 0 beat `h-12` outright and the flex algorithm sized all
            three from their content instead. They came out 21px tall, which is
            what "still too thin" was. Above `sm` the main axis is the width
            again and it means what it was written to mean.

            No width utility on the phone side: a column flex container stretches
            its items across the cross axis already. */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/jams/${card.jamSessionId}`}
            className="btn h-12 border-none bg-royal-blue font-bold text-white hover:bg-royal-blue/90 sm:flex-1"
          >
            Overview
          </Link>

          {/* Reschedule opens the simulated edit — see `RescheduleDialog` and
              `docs/my-bookings.md`. Both are disabled rather than hidden on a
              past or cancelled booking: they are three buttons in a row, and a
              row that loses items on some bookings reads as a layout bug rather
              than as an answer. */}
          <button
            type="button"
            disabled={!canReschedule}
            onClick={() => setRescheduling(true)}
            className="btn h-12 border-none bg-pale-blue font-bold text-royal-blue sm:flex-1"
          >
            Reschedule
          </button>

          {/* The quietest of the three, and the only one that destroys
              something. It opens a dialog rather than cancelling, so this button
              commits nothing — which is what lets it sit in a row with the other
              two instead of being fenced off from them. */}
          <button
            type="button"
            disabled={!canCancel}
            onClick={() => setCancelling(true)}
            /* The only hover in the row that darkens rather than lightens. It
               is the button that leads somewhere destructive, and an outlined
               button with no hover at all reads as disabled next to two filled
               ones. Not red: nothing is destroyed by pressing it — the dialog
               it opens is where that is decided. */
            className="btn h-12 border-base-300 bg-base-100 font-bold text-dark-teal transition-colors hover:border-dark-teal hover:bg-dark-teal hover:text-white sm:flex-1"
          >
            Cancel booking
          </button>
        </div>
      </Panel>

      {/* Mounted only while open, so every reopening is a fresh fetch of the
          session's slots and a selection seeded from the booking — rather than
          whatever was on screen when it was last dismissed. */}
      {rescheduling && onRescheduled && (
        <RescheduleDialog
          jamSessionId={card.jamSessionId}
          groupId={card.groupId}
          current={{ slotId: booking.slotId, spotIds, bandName: card.bandName }}
          onClose={() => setRescheduling(false)}
          onDone={onRescheduled}
        />
      )}

      {cancelling && onCancelled && (
        <CancelBookingDialog
          groupId={card.groupId}
          onClose={() => setCancelling(false)}
          onCancelled={onCancelled}
        />
      )}
    </div>
  );
}
