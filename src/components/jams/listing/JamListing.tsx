'use client';

import type { JamListingView } from '@/lib/jamListing';
import JamIntroCard from './JamIntroCard';
import JamSlotBoard from './JamSlotBoard';

/* A jam session as a musician sees it, drawn for the venue.

   Two places need this: the builder's last step, where it is the venue's last
   look before publishing, and the Listing panel on the backstage, where it is
   what they published. Both are the same question — *what does a musician get?*
   — so both are the same component.

   It is a composition rather than a drawing. The two pieces are the ones the
   musician's page renders (`JamIntroCard`, `JamSlotBoard`), which is what makes
   the answer trustworthy: there is no second layout here to fall out of step
   with the first. Everything that differs between the venue's view and the
   musician's is in the view model (`lib/jamListing`), in the heading level, or
   in the absence of a slot handler — see the notes in those two files. The venue
   sees no more of the session than a musician does, which is the point: this is
   the screen that answers "what am I publishing?", and a panel only the venue
   ever sees is one more thing the answer has to be qualified about.

   Headings start at h2. The page around it owns the h1: "Preview & publish" in
   the builder, the session card on the backstage. */

type JamListingProps = {
  listing: JamListingView;
  /* A night the venue called off. The builder never passes it — an unpublished
     session cannot have been cancelled — and the backstage panel does. */
  cancelled?: boolean;
};

export default function JamListing({ listing, cancelled = false }: JamListingProps) {
  const { slotDurationMinutes, slots } = listing;

  return (
    /* Its own pale ground, which the musician's page gets from the page itself.
       Both hosts here are a white card inside a builder, and the blocks below
       are white panels — on white they lose the separation the whole layout is
       built on, and the fade over the collapsed intro would fade into the wrong
       colour. Carrying the ground is cheaper than asking two unrelated hosts to
       change theirs.

       The gaps are the detail page's own, because the "Show me more" button is
       positioned with a negative margin against them. */
    <div className="flex flex-col gap-9 rounded-box bg-pale-blue p-4 sm:p-6 lg:gap-14 lg:p-8">
      <JamIntroCard listing={listing} as="h2" cancelled={cancelled} />

      {/* No slot handler: there is nothing to book on a session that doesn't
          exist yet, and nothing for a venue to book on one that does. */}
      <JamSlotBoard
        listing={listing}
        cancelled={cancelled}
        /* Not "Time slots" — the grid inside the board is already headed that,
           and the two sat four lines apart saying the same word. The musician's
           title is an instruction ("Book your time slot"); this one says what
           the venue is looking at. */
        title="What a musician books"
        lead={slotSummary(slots.length, slotDurationMinutes)}
      />
    </div>
  );
}

/* What the board says to someone who can't book from it. The musician's page
   asks them to pick a time; the venue is being told what they built. */
const slotSummary = (count: number, durationMinutes: number): string => {
  if (count === 0) return 'Slots appear once this session has times to divide.';

  return `${count} slot${count === 1 ? '' : 's'} of ${durationMinutes} minutes each.`;
};
