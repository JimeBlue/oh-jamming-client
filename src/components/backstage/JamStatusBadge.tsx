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

/* The same four states seen from a coloured card rather than from white. The
   board's rows carry their status as the card's own fill now, so the chip on top
   of one can't also be a wash of that status — it would be the card's colour
   twice. A white chip instead, lettered in the card's own colour, so the badge
   reads as cut out of the card rather than laid on it.

   Today is the exception, the way it was against white: the green is what makes
   it the one row a venue's eye lands on, and that has to survive being on a card
   that is already a colour.

   Past and cancelled go translucent rather than white: on the grey card a white
   chip is the brightest thing in the row, which is the opposite of what a night
   that is over should be. */
const PILL = 'rounded-full px-4 py-1';

/* Squarer and tighter than the pill the surface badges wear — this one shares a
   card with the Cancel button, and two different roundings an inch apart read as
   an accident. */
const CHIP = 'rounded-field px-3 py-0.5';

const ON_COLOR = {
  upcoming: {
    className: `${CHIP} bg-base-100 text-royal-blue`,
    dot: 'bg-royal-blue',
  },
  today: { className: `${CHIP} bg-emerald-green text-white`, dot: 'bg-white' },
  past: { className: `${CHIP} bg-white/25 text-white`, dot: 'bg-white/70' },
  cancelled: { className: `${CHIP} bg-white/25 text-white`, dot: 'bg-white/70' },
} as const satisfies Record<JamStatus, { className: string; dot: string }>;

export default function JamStatusBadge({
  status,
  tone = 'surface',
}: {
  status: JamStatus;
  tone?: 'surface' | 'onColor';
}) {
  const { label, ping } = STATUS[status];
  const onColor = tone === 'onColor';
  const { className, dot } = onColor ? ON_COLOR[status] : STATUS[status];

  /* Shape rides with the colour rather than sitting on the wrapper, because the
     on-colour Today is the one badge that isn't a pill and a `rounded-full` in
     the base would be there to be fought with. */
  const shape = onColor ? '' : PILL;

  return (
    /* border-0 because daisyUI gives every badge a 1px border from `--border`,
       and against these soft fills it reads as a second, darker outline of the
       same shape rather than as an edge.

       `h-auto` is what makes `py-1` mean anything: `.badge` sets an explicit
       `height: var(--size)`, so padding alone changes nothing and the pill stays
       the height daisyUI picked. Releasing the height lets the content set it.

       The pill's padding is deliberately lopsided — 1rem beside the words,
       0.25rem above and below. A pill wants to be wider than it is tall, and
       matching the two turns it into a lozenge with a lot of dead colour in it.

       No `badge-lg`: its only remaining job here was the font size, since
       `h-auto` already gave the height away, and at that size the label competed
       with the row's own heading. `text-sm` sets it directly. */
    <span
      className={`badge h-auto gap-2 border-0 text-sm font-bold ${shape} ${className}`}
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
