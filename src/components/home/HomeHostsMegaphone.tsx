'use client';

import MaskIcon from '@/components/ui/MaskIcon';
import useInView from '@/hooks/useInView';

/* The watermark behind the hosts pitch, swelling once as it is scrolled to.
 *
 * Two elements rather than one, and that is the whole reason this isn't a
 * className on the `MaskIcon` in `HomeHosts`. The watermark is positioned with
 * `lg:-translate-y-1/2`, and `transform` is a single property — a keyframe
 * setting `scale()` on that same element replaces the translate outright and
 * drops the artwork half its own height down the section at `lg`. So the outer
 * span keeps the position and the inner one does the moving.
 *
 * Its own client file for the same reason `HomeStepBadge` has one: `HomeHosts`
 * is two links and four written-in numbers, and it stays on the server.
 */
export default function HomeHostsMegaphone({
  src,
  className,
}: {
  src: string;
  className: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();

  return (
    <span ref={ref} aria-hidden className={className}>
      {/* `block` is load-bearing, not tidiness. `MaskIcon` renders a bare
          `<span>` and sets no display of its own — it used to get one from the
          caller, because the class list it carried here included `md:block`.
          Now that the wrapper holds those, the inner span falls back to
          `inline`, where width and height do nothing at all: the box collapses
          and the mask has no area to paint through.

          `size-full` rather than repeating the size classes: the artwork fills
          whatever box the breakpoint gave the wrapper, so the two elements
          can't disagree about how big the watermark is. */}
      <MaskIcon
        src={src}
        className={`block size-full bg-accent/[0.13] ${
          inView ? 'animate-swell motion-reduce:animate-none' : ''
        }`}
      />
    </span>
  );
}
