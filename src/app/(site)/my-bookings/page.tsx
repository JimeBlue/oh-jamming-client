import type { Metadata } from 'next';

import RequireRole from '@/components/auth/RequireRole';
import MyBookingsList from '@/components/bookings/MyBookingsList';

export const metadata: Metadata = {
  title: 'My bookings · Oh Jamming',
};

/* The musician's list of nights they are playing.

   In `(site)`, so it wears the public header — this is somewhere a musician goes
   between browsing and turning up, not a separate workspace like the venue's
   backstage. `RequireRole` sends an anonymous visitor to `/login?next=` and
   shows a venue an explanation rather than a 404: a venue reaching this isn't
   lost, it is holding the other kind of account. It is UX, not security —
   `GET /bookings` scopes to the session cookie whatever the client does.

   A server component around a client one, the same split as `/jams`: `metadata`
   is a server export and the list has to fetch from the browser, because the
   session cookie is on the API's domain and nothing rendered on this server can
   read it. */
export default function MyBookingsPage() {
  return (
    /* pt-28 clears the fixed header. The page colour is the design's own pale
       blue rather than the site's `brand-paper`: the cards here are saturated
       blocks, and on the near-neutral off-white the rest of the app uses they
       read as louder than anything around them instead of as tickets on a desk. */
    <main className="min-h-screen flex-1 bg-pale-blue pt-28">
      {/* The same max width and padding steps as the header's bar, so the first
          card starts where the logo does. */}
      <div className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold text-dark-teal sm:text-5xl">
          My Bookings
        </h1>

        <div className="mt-8">
          <RequireRole role="musician">
            <MyBookingsList />
          </RequireRole>
        </div>
      </div>
    </main>
  );
}
