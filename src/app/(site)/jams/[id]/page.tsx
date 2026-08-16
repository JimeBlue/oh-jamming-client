import type { Metadata } from 'next';

import JamIntroCard from '@/components/jams/detail/JamIntroCard';
import JamSlotPicker from '@/components/jams/detail/JamSlotPicker';

export const metadata: Metadata = {
  title: 'Jam session · Oh Jamming',
  description: 'The night in full — what is played, who is playing, and what is still free.',
};

/* The page every card on the browse has been linking at, and until now 404ing
   on. Scaffold only: two cards of placeholder copy, no fetch. The session itself
   arrives next, through `getJamSession` and `jamSessionToListing`, which is what
   keeps this page and the builder's preview drawing the same listing.

   Indigo rather than the browse's `brand-paper`. The cards are base-100 either
   way, and the browse is a grid of twelve of them where a near-white ground
   reads as space between cards; here there is one column and the ground is the
   page, so it carries the brand instead. */
type JamDetailPageProps = {
  params: Promise<{ id: string }>;
  /* Set when a musician is coming back from the login gate — it is what they had
     picked before being asked to sign in, and putting it back is the difference
     between resuming and starting over. */
  searchParams: Promise<{ slot?: string }>;
};

export default async function JamDetailPage({
  params,
  searchParams,
}: JamDetailPageProps) {
  const { id } = await params;
  const { slot } = await searchParams;

  return (
    /* pt-28 clears the fixed header, same as the browse. The horizontal padding
       is on the inner container so a future full-bleed band can sit outside it
       and still run edge to edge. */
    <main className="min-h-screen flex-1 bg-primary pt-28">
      {/* Narrower than the browse's 7xl: this is one column of prose, and a
          paragraph the full width of a four-card grid is unreadable. */}
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-20 sm:px-6 lg:px-8">
        <JamIntroCard />

        {/* The id goes to the picker rather than being fetched here: the session
            is public, but continuing has to know whether the visitor is signed
            in, and that cookie is unreadable from this server. */}
        <JamSlotPicker id={id} initialSlotId={slot} />
      </div>
    </main>
  );
}
