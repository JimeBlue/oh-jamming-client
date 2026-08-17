'use client';

import JamListing from '@/components/jams/listing/JamListing';
import { jamSessionToListing } from '@/lib/jamListing';
import { useJamDetail } from './JamDetailContext';

/* The published session, exactly as a musician sees it.

   Nothing is designed here on purpose. `JamListing` is the same component the
   builder renders as its last step, and it is itself built from the two blocks
   the musician's page renders — the moment this drew its own version of the
   listing, the preview a venue approved before publishing would have stopped
   predicting the page they get afterwards.

   No slot handler anywhere in that chain, which is what makes the slots a board
   rather than a row of buttons: this is a venue checking what is live, not
   somebody booking.

   No heading and no frame either, and the route drops the session card above it
   (see `JamDetailShell`). All three said the same thing the listing says louder
   two centimetres lower — the night's name is the first thing in it — and a
   white card wrapped around a page that carries its own pale ground is a border
   with nothing on either side of it. The rail already names the section. */
export default function ListingPanel() {
  const { session } = useJamDetail();

  return (
    /* The view model drops `status` on the way through — it is not something a
       listing says about itself — so a cancelled night is read off the response
       here and handed over, the same as on the musician's page. */
    <JamListing
      listing={jamSessionToListing(session)}
      cancelled={session.status === 'cancelled'}
    />
  );
}
