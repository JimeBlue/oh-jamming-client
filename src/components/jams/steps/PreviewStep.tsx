'use client';

import { useWatch } from 'react-hook-form';
import { FaRegEye } from 'react-icons/fa6';

import { useJamImage } from '@/context/JamImageContext';
import { useJamForm } from '@/hooks/useJamForm';
import { jamFormToListing } from '@/lib/jamListing';
import JamListing from '../listing/JamListing';

/* The last look before it goes live — and the real listing, not a recap of the
   fields that produced it. A summary of what was typed can only tell the venue
   that they typed it; this tells them whether the night reads well, which is the
   question the step is actually for. `JamListing` is the component the musician's
   page renders too, so approving it here means approving what ships.

   The one thing the listing can't say is what publishing will *create*, because
   a musician has no reason to care: the slot count and the spot total are a
   product of numbers entered three steps apart, and the strip above the preview
   is the only place they appear together. */
export default function PreviewStep() {
  const { control } = useJamForm();

  /* `compute` rather than watching the whole form: the result is deep-compared,
     so a keystroke that doesn't change the listing doesn't re-render it — and
     unlike the bare `useWatch({ control })`, it hands over fully typed values
     instead of a deep-partial that has to be defaulted field by field. */
  const listing = useWatch({ control, compute: jamFormToListing });

  /* The one field the form can't supply. The photo is still a File in this tab
     until publishing, so `jamFormToListing` leaves `image` empty and the blob:
     URL is put in here — the same bytes the API will be sent, so the frame shows
     what will ship rather than a stand-in for it. */
  const { previewUrl } = useJamImage();

  const spotsPerSlot = listing.lineUp.reduce(
    (total, { spotsTotal }) => total + spotsTotal,
    0,
  );
  const bookableSpots = spotsPerSlot * listing.slots.length;

  return (
    <div className="space-y-6">
      {/* A tinted panel rather than `alert-info`: this theme's --color-info is a
          solid loud block, and this is a quiet sentence. Royal blue rather than
          the builder's `primary`, because everything below it is now the
          musician's page and this line is the last thing wearing the wizard's
          colours before that starts. */}
      <div
        role="note"
        className="flex gap-3 rounded-box border border-royal-blue/40 bg-royal-blue/10 p-4"
      >
        <FaRegEye className="mt-0.5 size-5 shrink-0 text-royal-blue" />
        <p className="text-sm text-dark-teal">
          This is your session as musicians will see it.{' '}
          {bookableSpots > 0 ? (
            <>
              Publishing it opens{' '}
              <span className="font-bold tabular-nums">{listing.slots.length}</span>{' '}
              slots and{' '}
              <span className="font-bold tabular-nums">{bookableSpots}</span>{' '}
              bookable spots.
            </>
          ) : (
            <>Go back and check the times and the line-up — nothing is bookable yet.</>
          )}
        </p>
      </div>

      {/* No slot handler: there is nothing to book on a session that doesn't
          exist yet, so the slots render as the list of times they are. */}
      <JamListing listing={{ ...listing, image: previewUrl ?? '' }} />
    </div>
  );
}
