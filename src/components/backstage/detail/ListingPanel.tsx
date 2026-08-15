'use client';

import JamListing from '@/components/jams/listing/JamListing';
import { jamSessionToListing } from '@/lib/jamListing';
import { useJamDetail } from './JamDetailContext';

/* The published session, exactly as a musician sees it.

   Nothing is designed here on purpose. `JamListing` is the same component the
   builder renders as its last step, fed through the same adapter — the moment
   this drew its own version of the listing, the preview a venue approved before
   publishing would have stopped predicting the page they get afterwards.

   No `onSelectSlot`, which is what makes the slot list a list rather than a row
   of buttons: this is a venue checking what is live, not somebody booking. */
export default function ListingPanel() {
  const { session } = useJamDetail();

  return (
    <section className="rounded-box bg-base-100 p-4 shadow-xl sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
        <h2 className="shrink-0 font-heading text-xl">Listing</h2>
        <p className="max-w-prose text-sm text-base-content/80">
          What a musician sees when they open this session.
        </p>
      </div>

      <div className="mt-6">
        <JamListing listing={jamSessionToListing(session)} />
      </div>
    </section>
  );
}
