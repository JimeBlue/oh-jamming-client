'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

import rockHand from '@/assets/rock-hand.png';
import MaskIcon from '@/components/ui/MaskIcon';
import type { Booking } from '@/schemas/booking';
import { ApiError } from '@/services/api';
import { getJamSessionBookings } from '@/services/bookings';

/* Step four: the booking exists, and this is the proof of it.

   The QR is fetched rather than passed through the URL. The token is what gets
   scanned at the door, so it has no business sitting in an address bar — in
   history, in a shared link, in a screenshot of the tab. `?group=` names the
   booking; the API decides whether the caller may see it.

   `GET /bookings?jamSessionId=` is that check. It answers "what am I playing?"
   for a musician and scopes to the session cookie, so a groupId belonging to
   somebody else comes back as nothing to filter — no separate ownership test
   here, because there is no way to ask this endpoint about another musician. */

type ConfirmedState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; rows: Booking[] };

const asMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

const Card = ({ children }: { children: React.ReactNode }) => (
  <section className="rounded-box bg-base-100 p-6 text-center text-base-content shadow-lg sm:p-8">
    {children}
  </section>
);

export default function BookingConfirmed({
  id,
  groupId,
}: {
  id: string;
  groupId: string;
}) {
  const [state, setState] = useState<ConfirmedState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    getJamSessionBookings(id)
      .then((bookings) => {
        if (active) {
          setState({
            status: 'ready',
            rows: bookings.filter((booking) => booking.groupId === groupId),
          });
        }
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: asMessage(error) });
      });

    return () => {
      active = false;
    };
  }, [id, groupId]);

  if (state.status === 'loading') {
    return (
      <Card>
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="sr-only">Loading your booking</span>
        </div>
      </Card>
    );
  }

  /* The booking is already made whatever happened here, so this never says the
     booking failed — only that the code couldn't be drawn yet. Same for an empty
     group: the spots are claimed, and the QR is somewhere else. */
  const qr = state.status === 'ready' ? state.rows[0]?.qrCode : undefined;

  return (
    <Card>
      {/* The same sticker the Confirm button wore on the step before, so the
          page that lands reads as the answer to the button that was pressed.
          Decorative beside the heading it sits on, hence no label.

          No gap between them: the artwork carries its own transparent margin, so
          any spacing set here is added to space that is already in the file.

          Inline rather than a flex row: on a phone the title wraps to two lines,
          and as a flex item the glyph was centred against both of them — sitting
          in the margin beside the wrap instead of in front of the first word.
          `inline-block` because a bare inline span ignores width and height. */}
      <h1 className="font-heading text-3xl">
        <MaskIcon
          src={rockHand.src}
          className="inline-block size-8 -translate-y-0.5 align-middle bg-primary"
        />
        Thank you for your booking!
      </h1>

      <p className="mx-auto mt-3 max-w-md text-sm opacity-80">
        See this QR code. Cancel or edit your booking.
      </p>

      {/* Straight to this booking rather than to the list: the musician has just
          made it, and it is the one they came here about. The list is one tap
          further on from there. */}
      <Link
        href={`/my-bookings/${groupId}`}
        className="btn btn-outline btn-primary mt-4 font-bold"
      >
        My booking
      </Link>

      {qr ? (
        /* White ground and a quiet zone around it, both of which a scanner needs
           — the padding is the margin the spec asks for, and drawn here rather
           than by the component so it is white too. `max-w` in rem rather than a
           fixed size: it has to stay square and stay scannable on a phone. */
        <div className="mx-auto mt-8 w-full max-w-64 rounded-box bg-white p-4">
          <QRCode
            value={qr}
            /* The library sizes to its box; this keeps it square inside a
               responsive parent instead of at a fixed pixel width. */
            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
            /* Errors correct up to ~15% obscured, which is what makes a code
               survive being photographed off a phone screen at the door. */
            level="M"
          />
        </div>
      ) : (
        <p role="alert" className="mt-8 text-sm opacity-80">
          {state.status === 'error'
            ? state.message
            : 'Your spots are booked. The QR code will be in My bookings.'}
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-outline btn-primary font-bold">
          Back to home
        </Link>
        <Link href="/jams" className="btn btn-primary font-bold">
          See all jam sessions
        </Link>
      </div>
    </Card>
  );
}
