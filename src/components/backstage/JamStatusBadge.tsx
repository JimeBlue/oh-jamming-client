import type { JamStatus } from '@/lib/jamStatus';

/* Each state says itself in words as well as in colour — the badge has to be
   readable to someone who can't tell the lime from the green, and "Past" is not
   a thing a colour can spell.

   Three of them are a dark label on a pale pill. Today is the inverse — solid
   brand indigo with the brand lime on top — and that inversion is what makes it
   the one row a venue's eye lands on, more than any hue choice could. It is also
   where the raw `--color-brand-green` finally gets used at full strength: on
   white it is 1.2:1 and unreadable, on this indigo it is 4.7:1.

   Upcoming and Cancelled take their fill from their own text colour at low
   alpha, so the pair can't drift apart: change the token and the pill follows.
   Past is given a surface instead, because its pill is a neutral grey rather
   than a wash of the grey above it.

   `dot` and `ping` are spelled out on all four rather than only on the ones that
   need them. Three entries just say `bg-current` and `false`, which is
   redundant — and is what makes Today's moving dot look like the deliberate
   exception it is instead of something half-edited.

   Only Today pings, and only Today should: the animation means "this one is
   happening now", which is a claim exactly one row can make. On four rows it
   would say nothing and just move. */
const STATUS = {
  upcoming: {
    label: 'Upcoming',
    className: 'bg-brand-green/20 text-status-upcoming',
    dot: 'bg-current',
    ping: false,
  },
  today: {
    label: 'Today',
    className: 'bg-primary text-brand-green',
    dot: 'bg-brand-green',
    ping: true,
  },
  past: {
    label: 'Past',
    className: 'bg-status-past-surface text-status-past',
    dot: 'bg-current',
    ping: false,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-status-cancelled/10 text-status-cancelled',
    dot: 'bg-current',
    ping: false,
  },
} as const satisfies Record<
  JamStatus,
  { label: string; className: string; dot: string; ping: boolean }
>;

export default function JamStatusBadge({ status }: { status: JamStatus }) {
  const { label, className, dot, ping } = STATUS[status];

  return (
    /* border-0 because daisyUI gives every badge a 1px border from `--border`,
       and against these soft fills it reads as a second, darker outline of the
       same shape rather than as an edge.

       `h-auto` is what makes `py-2` mean anything: `.badge` sets an explicit
       `height: var(--size)`, so padding alone changes nothing and the pill stays
       the height daisyUI picked. Releasing the height lets the content set it.

       `rounded-full` over the theme's `--radius-selector` (0.5rem) — at this
       height that reads as a rounded rectangle, and the design's badges are
       pills. */
    <span
      className={`badge badge-lg h-auto gap-2 rounded-full border-0 px-4 py-2 font-bold ${className}`}
    >
      {/* aria-hidden on the whole thing: it carries no meaning the label doesn't
          already, which is what makes the animation safe to hide outright below
          rather than having to slow it down. */}
      <span aria-hidden className="relative flex size-2 shrink-0">
        {ping && (
          /* The halo, behind the dot and scaling out of it. `motion-reduce`
             drops it rather than slowing it: an indefinite animation is exactly
             what someone who asked their OS for less motion asked to be spared,
             and the solid dot underneath still marks the row, so nothing is
             lost by removing it. */
          <span
            className={`absolute inline-flex size-full animate-ping rounded-full opacity-75 motion-reduce:hidden ${dot}`}
          />
        )}

        {/* `relative` so it paints above the halo rather than under it. */}
        <span className={`relative inline-flex size-2 rounded-full ${dot}`} />
      </span>
      {label}
    </span>
  );
}
