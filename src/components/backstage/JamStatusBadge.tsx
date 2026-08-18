import type { JamStatus } from '@/lib/jamStatus';

/* Each state says itself in words as well as in colour — the badge has to be
   readable to someone who can't tell the lime from the green, and "Past" is not
   a thing a colour can spell.

   The two live states are outlined on white rather than filled, which is what
   lets the dot beside the label be a *different* colour from the edge around
   it: Today is a lime ring with a saturated green dot inside it, Upcoming the
   same shape in royal blue. Filled pills couldn't do that — a dot on a wash of
   its own colour is either invisible or a second fill.

   Today is the one that has to be found at a glance, so it takes the lime,
   which nothing else on this page uses as a line. Upcoming takes the blue the
   rest of the cockpit is drawn in, at 40% for the edge and full strength for
   the dot and the word: the same colour three deep, so it reads as one state
   rather than as a badge assembled from parts.

   Past and Cancelled are still filled pills with no edge. They are the two that
   mean "nothing to do here", and an outline is an invitation.

   `dot` and `ping` are spelled out on all four rather than only on the ones that
   need them. Two entries just say `bg-current` and `false`, which is
   redundant — and is what makes Today's moving dot look like the deliberate
   exception it is instead of something half-edited.

   Only Today pings, and only Today should: the animation means "this one is
   happening now", which is a claim exactly one row can make. On four rows it
   would say nothing and just move. */
const STATUS = {
  upcoming: {
    label: 'Upcoming',
    className: 'border border-royal-blue/40 bg-base-100 text-royal-blue',
    dot: 'bg-royal-blue',
    ping: false,
  },
  today: {
    label: 'Today',
    className: 'border border-brand-green bg-base-100 text-dark-teal',
    dot: 'bg-emerald-green',
    ping: true,
  },
  past: {
    label: 'Past',
    className: 'border-0 bg-status-past-surface text-status-past',
    dot: 'bg-current',
    ping: false,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'border-0 bg-status-cancelled/10 text-status-cancelled',
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
/* `rounded-field` rather than `rounded-full`: this sits an inch from the header's
   own buttons, which take their corner from the same token, and a capsule beside
   them read as a different family of control. Shorter than a button too —
   `py-0.5` against a button's `--size` — because it is a label about the session
   and not a thing to press, and matching their height is what would make it look
   like one. */
const SURFACE = 'rounded-field px-4 py-0.5';

/* The same corner as above and tighter across, because this one shares a card
   with the Cancel button and has less room to spend. */
const CHIP = 'rounded-field border-0 px-3 py-0.5';

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

  /* Shape rides with the colour rather than sitting on the wrapper: the two sets
     agree on the corner but not on how much room they have across, and the
     on-colour one already carries its own padding. */
  const shape = onColor ? '' : SURFACE;

  return (
    /* The border is decided per state rather than switched off here. daisyUI
       gives every badge a 1px edge from `--border`, which against a soft fill is
       a second, darker outline of the same shape — so the filled ones say
       `border-0` — while the two outlined states want that edge in a colour of
       their own. Left on the wrapper it would have been a rule to fight either
       way round.

       `h-auto` is what makes the vertical padding mean anything: `.badge` sets an
       explicit `height: var(--size)`, so padding alone changes nothing and the
       badge stays the height daisyUI picked. Releasing the height lets the
       content set it.

       The padding is deliberately lopsided — 1rem beside the words, 0.125rem
       above and below. A badge wants to be wider than it is tall, and matching
       the two turns it into a lozenge with a lot of dead colour in it.

       No `badge-lg`: its only remaining job here was the font size, since
       `h-auto` already gave the height away, and at that size the label competed
       with the row's own heading. `text-sm` sets it directly. */
    <span
      className={`badge h-auto gap-2 text-sm font-bold ${shape} ${className}`}
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
