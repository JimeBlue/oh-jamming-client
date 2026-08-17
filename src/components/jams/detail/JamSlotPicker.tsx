'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaArrowRight } from 'react-icons/fa6';

import JamSlotBoard from '@/components/jams/listing/JamSlotBoard';
import { useAuth } from '@/context/AuthContext';
import type { JamListingView } from '@/lib/jamListing';

/* The cyan box with a way out of it — the step where the booking flow actually
   starts.

   The box itself is `JamSlotBoard`, which the venue's preview and Listing panel
   render too. What is owned here is everything that box has no business knowing:
   which slot is chosen, whether the visitor is signed in, and where Next goes.

   The session arrives already fetched from `JamDetailView` — one request feeds
   this and the blocks above, so the name up there and the times down here can't
   come from two different reads. */

export default function JamSlotPicker({
  id,
  listing,
  cancelled,
  initialSlotId,
}: {
  id: string;
  listing: JamListingView;
  cancelled: boolean;
  initialSlotId?: string;
}) {
  const router = useRouter();
  const { status: authStatus } = useAuth();

  /* Picking and continuing are two acts, and the button below is what separates
     them. A tile that navigated on click would leave a musician on the next page
     with no way to see which slot they chose or to change their mind short of
     going back.

     Seeded from `?slot=` so a musician returning from the login gate finds their
     choice already made — they left this page mid-decision, and the point of
     sending them back here rather than onward is that they get to see it and
     press Next themselves. An id that matches no slot simply highlights
     nothing, which is the right answer for a hand-edited URL. */
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    initialSlotId ?? null,
  );

  /* Where Next goes, and the one place the login gate is decided for this
     flow.

     An anonymous musician is sent to /login with *this* page as the destination,
     slot and all — not the booking page. Landing back here is the whole point:
     they picked a time, got interrupted by a sign-in they didn't ask for, and
     the honest way to resume is to show them the choice they made and let them
     press Next themselves.

     `RequireRole` still guards the booking route, and still redirects to it
     rather than here. That is not the same check said twice: it catches someone
     opening /jams/x/book directly, where this page was never involved and there
     is nothing to come back to. */
  const continueToBooking = (slotId: string) => {
    const booking = `/jams/${id}/book?slot=${encodeURIComponent(slotId)}`;

    if (authStatus === 'anonymous') {
      const back = `/jams/${id}?slot=${encodeURIComponent(slotId)}`;

      router.push(`/login?next=${encodeURIComponent(back)}`);
      return;
    }

    router.push(booking);
  };

  return (
    <JamSlotBoard
      listing={listing}
      cancelled={cancelled}
      title="Book your time slot"
      lead="Choose an available time slot that works best for you."
      selectedSlotId={selectedSlotId}
      onSelect={setSelectedSlotId}
      footer={
        /* Disabled until a slot is picked, because there is nothing to continue
           to — the booking route sends anyone arriving without a slot straight
           back here. Also while `/auth/me` is still out: the branch above
           depends on the answer, and guessing sends half of them to the wrong
           page.

           Disabled by attribute rather than by a class: the attribute is what
           takes it out of the tab order and stops the click. The styling is
           written out instead of using `btn-primary` because daisyUI's disabled
           treatment is a grey fill, which on this cyan reads as a hole in the
           card rather than as a button waiting.

           It empties out to an outline on hover, the same move the two booking
           steps and the browse's cards make — but in white rather than in its
           own royal blue, because this is the one of the three that sits on
           cyan and blue on cyan is two of the same hue. The border is there at
           rest in the fill's own colour, so gaining a visible edge doesn't
           change the button's height. */
        <button
          type="button"
          disabled={selectedSlotId === null || authStatus === 'loading'}
          onClick={() => continueToBooking(selectedSlotId ?? '')}
          className="btn h-12 w-full border-royal-blue bg-royal-blue px-10 font-display text-base font-bold text-white shadow-none transition-colors hover:border-white hover:bg-transparent hover:text-white disabled:border-transparent disabled:bg-dark-teal/25 disabled:text-white/60 sm:w-auto"
        >
          Next
          <FaArrowRight aria-hidden className="size-4" />
        </button>
      }
    />
  );
}
