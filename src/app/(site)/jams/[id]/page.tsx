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

   `pale-blue`, the same ground the musician's bookings sit on — and the reason
   the page reads the way it does. The colour is now carried by the blocks: an
   indigo card for the night's name, a cyan one for the slots, white panels
   between them. On an indigo page none of that would be visible, because the
   loudest thing would be the part with nothing on it. */
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
    <main className="min-h-screen flex-1 bg-pale-blue pt-28">
      {/* Wider than it was, because the two columns are now 1.65/1 rather than
          3/2 and the right one is a stack of panels that go ragged when they get
          narrow. The left column's own paragraphs are held at 62ch regardless,
          so the extra width goes to the photo and the map rather than to line
          length. */}
      <div className="mx-auto flex w-full max-w-[77.5rem] flex-col gap-9 px-4 pb-20 sm:px-6 lg:gap-14 lg:px-10">
        <JamDetailView id={id} initialSlotId={slot} />
      </div>
    </main>
  );
}
