'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import BookingCard from '@/components/bookings/BookingCard';
import { toBookingCards, type BookingCardView } from '@/lib/myBookings';
import { ApiError } from '@/services/api';
import { getMyBookings } from '@/services/bookings';

/* The musician's own list. One request with no filter — the API reads whose it
   is from the session cookie — and the whole page is drawn from it, because
   `jamSession` comes back populated. No second fetch, and nothing here knows a
   session id it didn't get from a booking.

   Client-side for the reason everything authenticated in this app is: the
   session lives in httpOnly cookies on the API's domain, so a Server Component
   cannot read it and could not make this request. */

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; cards: BookingCardView[] };

const asMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

export default function MyBookingsList() {
  const [state, setState] = useState<ListState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    getMyBookings()
      .then((bookings) => {
        if (active) setState({ status: 'ready', cards: toBookingCards(bookings) });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: asMessage(error) });
      });

    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-cyan-blue" />
        <span className="sr-only">Loading your bookings</span>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <p role="alert" className="rounded-box bg-base-100 p-6 text-sm text-base-content shadow-sm">
        {state.message}
      </p>
    );
  }

  if (state.cards.length === 0) {
    return (
      <div className="rounded-box bg-base-100 p-8 text-center shadow-sm">
        <p className="font-display text-xl font-bold text-dark-teal">
          You haven&rsquo;t booked a spot yet
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-base-content/70">
          Find a night you like, pick a time slot and claim an instrument. It shows up here.
        </p>
        <Link href="/jams" className="btn btn-primary mt-6 font-bold">
          Find a jam session
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-5">
      {state.cards.map((card) => (
        <li key={card.groupId}>
          <BookingCard booking={card} />
        </li>
      ))}
    </ul>
  );
}
