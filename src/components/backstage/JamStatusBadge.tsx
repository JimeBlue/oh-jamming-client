import type { JamStatus } from '@/lib/jamStatus';

/* Each state says itself in words as well as in colour — the badge has to be
   readable to someone who can't tell the green from the grey, and "Past" is not
   a thing a colour can spell.

   Red is Cancelled's alone. Past is grey rather than red because a jam that
   happened is not a failure: colouring it like an error trains the venue to
   ignore the one badge that means something went wrong. */
const STATUS = {
  upcoming: { label: 'Upcoming', className: 'badge-success' },
  today: { label: 'Today', className: 'badge-primary' },
  past: { label: 'Past', className: 'badge-neutral' },
  cancelled: { label: 'Cancelled', className: 'badge-error' },
} as const satisfies Record<JamStatus, { label: string; className: string }>;

export default function JamStatusBadge({ status }: { status: JamStatus }) {
  const { label, className } = STATUS[status];

  /* `badge-soft` rather than the solid fill: four saturated pills down a list
     compete with the session titles, which are what the venue is actually
     scanning for. */
  return (
    <span className={`badge badge-soft font-bold ${className}`}>{label}</span>
  );
}
