'use client';

import useInView from '@/hooks/useInView';

/* Written out rather than computed from the index, because Tailwind reads the
   source as text — a template literal would produce a class that exists at
   runtime and was never generated.
 *
 * `lg:` only, and that is the point of the array rather than a plain stagger.
 * The three cards are a row from `lg` up, so they cross the fold together and
 * the delay is what turns one event into first, then second, then third. Below
 * `lg` they are stacked, each arrives on its own, and the same delay would be
 * dead time between a badge appearing and the badge doing anything — the
 * scroll has already staggered them. */
const DELAYS = ['', 'lg:[animation-delay:450ms]', 'lg:[animation-delay:900ms]'];

/* 450ms is not a guess: the jump's own down-beat lands at 58% of 0.72s, so the
   next badge leaves the ground as the one before it touches down. Closer and
   the three read as a wave passing through them; further and the row has a gap
   in the middle of it. */

/* The step number, and the one client component in an otherwise server-rendered
   section. Extracted to this file so it stays that way: `HomeSteps` is prose
   with nothing to fetch and nothing to click, and turning the whole of it into
   a client component to animate three spans would ship the copy through
   JavaScript to move a circle 14 pixels.
 *
 * An observer each, rather than one on the list. On a phone the three cards are
 * stacked far enough apart that a shared trigger would fire all three while the
 * second and third are still below the fold — the reader would scroll down to
 * two badges that had already finished. */
export default function HomeStepBadge({
  index,
  className,
}: {
  index: number;
  className: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();

  return (
    /* aria-hidden: the number is already carried by the list, and a screen
       reader announcing "01" before "item 1 of 3" is the same fact twice. */
    <span
      ref={ref}
      aria-hidden
      className={`grid size-9 place-items-center rounded-full font-display text-sm font-bold ${className} ${
        inView ? `animate-step-jump ${DELAYS[index]} motion-reduce:animate-none` : ''
      }`}
    >
      {String(index + 1).padStart(2, '0')}
    </span>
  );
}
