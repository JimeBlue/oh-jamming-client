import type { JamListingSlot } from '@/lib/jamListing';

/* The bookable slots, as a musician reads them.

   Interactive or not, depending on whether anyone passed `onSelect`. That isn't
   a flag — it's the difference between the two places this renders. In the
   builder's preview there is nothing to book: the session doesn't exist yet, and
   rows that highlight and depress under the pointer would be promising the venue
   an action that leads nowhere. On the musician's page picking a slot is the
   whole point, so there the rows are buttons.

   Rendering the non-interactive version as plain list items rather than disabled
   buttons is the same distinction stated to a screen reader: these are the times
   the night is divided into, not controls that happen to be switched off. */

type JamSlotListProps = {
  slots: readonly JamListingSlot[];
  selectedSlotId?: string | null;
  onSelect?: (slotId: string) => void;
};

export default function JamSlotList({
  slots,
  selectedSlotId,
  onSelect,
}: JamSlotListProps) {
  if (slots.length === 0) {
    return (
      <p className="text-sm opacity-60">
        Slots appear once the session has a start time, an end time and a slot
        length.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {slots.map((slot) => {
        const isSelected = slot.id === selectedSlotId;
        const isFull = slot.spotsFree === 0 && slot.spotsTotal > 0;

        const content = (
          <>
            <span className="font-bold tabular-nums">
              {slot.startTime} – {slot.endTime}
            </span>
            {/* Pink, except on the one row that has gone indigo underneath it —
                there the count would be the one unreadable thing on the card, so
                it takes the row's own contrasting colour instead. */}
            <span
              className={`text-sm font-bold ${
                isSelected ? 'opacity-80' : 'text-brand-pink-deep'
              }`}
            >
              {availability(slot)}
            </span>
          </>
        );

        const shared = `flex w-full items-center justify-between gap-3 rounded-field border px-4 py-3 text-left ${
          isSelected
            ? 'border-primary bg-primary text-primary-content'
            : 'border-base-300 bg-base-100'
        }`;

        return (
          <li key={slot.id}>
            {onSelect ? (
              <button
                type="button"
                /* The listing is rendered inside the builder's <form>; a button
                   without this would submit it. Harmless here and not on the
                   musician's page, but the component shouldn't depend on which. */
                onClick={() => onSelect(slot.id)}
                /* A full slot is still worth showing — it tells a musician the
                   night is busy — but there is nothing behind it. */
                disabled={isFull}
                aria-pressed={isSelected}
                className={`${shared} transition-colors disabled:opacity-50 ${
                  isSelected ? '' : 'hover:border-primary'
                }`}
              >
                {content}
              </button>
            ) : (
              <div className={shared}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* Two different facts, said two different ways. Nothing booked yet is the
   capacity of the slot; anything else is what is left of it. */
const availability = ({ spotsFree, spotsTotal }: JamListingSlot): string => {
  if (spotsTotal === 0) return 'No spots';
  if (spotsFree === 0) return 'Full';
  if (spotsFree === spotsTotal) return `${spotsTotal} spots`;

  return `${spotsFree} of ${spotsTotal} left`;
};
