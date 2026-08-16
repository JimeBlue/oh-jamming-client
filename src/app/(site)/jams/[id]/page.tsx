import type { Metadata } from 'next';

import JamDetailView from '@/components/jams/detail/JamDetailView';

export const metadata: Metadata = {
  title: 'Jam session · Oh Jamming',
  description: 'The night in full — what is played, who is playing, and what is still free.',
};

/* The page every card on the browse links at.

   Almost nothing happens here: the session is fetched in the browser, because
   the slot click has to know whether the visitor is signed in and that cookie is
   unreadable from this server. What this file owns is the ground and the column
   width.

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
      {/* Narrower than the browse's 7xl: the card inside splits 3/2, and at the
          browse's width the left column's paragraphs stop being readable. */}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-20 sm:px-6 lg:px-8">
        <JamDetailView id={id} initialSlotId={slot} />
      </div>
    </main>
  );
}
