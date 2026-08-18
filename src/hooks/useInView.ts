'use client';

import { useEffect, useRef, useState } from 'react';

/* Far enough in that the element is unmistakably on screen before it moves. A
   reveal that fires the instant one pixel crosses the fold animates something
   the reader can't see yet, and by the time they can it has finished. */
const ENTER_RATIO = 0.15;

/* Two thresholds, not one, because entering and leaving are asked at different
   points on purpose.
 *
 * It reveals at 0.15 but only re-arms at 0, once the element is *entirely* off
 * screen. A single threshold would make the same line the border in both
 * directions, so a reader parked with the tiles half showing — which is where a
 * scroll naturally stops — would flip them on and off with every small
 * movement of the wheel. The gap between the two is what makes the reveal a
 * thing that happens on arrival rather than a hover state for the scrollbar. */
const THRESHOLDS = [0, ENTER_RATIO];

/* The bottom quarter of the screen doesn't count as on screen.
 *
 * A ratio alone is a fraction of the *element*, which means it says something
 * completely different depending on how big that element is: 15% of a 400px
 * block is 60px and reads as "this has arrived", while 15% of a 36px badge is
 * five pixels clearing the bottom edge of a phone. The second is technically
 * visible and practically not — on a tall card the badge crosses that line
 * while the reader is still looking at the section above it, and a 0.7s
 * animation is over before they get there. Something that leaves a permanent
 * result survives being triggered early; something that plays once and returns
 * to where it started is simply missed.
 *
 * Shrinking the root instead makes the trigger a fixed distance up the screen
 * for every element, whatever its height. */
const ROOT_MARGIN = '0px 0px -25% 0px';

/* Is this element on screen?
 *
 * Hand-rolled rather than `react-intersection-observer`, which is what the
 * Eventbox project uses: the whole of what that library is wanted for here is
 * the twenty lines below, and this repo already keeps its own hooks for
 * smaller jobs than this one.
 *
 * It keeps observing rather than disconnecting on the first hit, so the answer
 * goes back to false when the element leaves and the reveal plays again the
 * next time it is scrolled to. That is a choice about this page rather than a
 * default: the home page is a thing people scroll up and down while deciding,
 * and a section that only ever animates once is a section most readers see
 * animate zero times, because the first pass was the one where they scrolled
 * straight past it.
 */
export default function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  /* True where there is no observer to ask. Hidden-until-proven-visible is the
     right default only when something can do the proving; without it the
     initial `false` would be permanent and the element would never appear. */
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    const element = ref.current;

    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        /* Neither branch is an `else`: between the two thresholds the element
           is partly showing and the answer is whatever it already was, which
           is the hysteresis the two thresholds exist to create. */
        if (entry.intersectionRatio >= ENTER_RATIO) setInView(true);
        if (entry.intersectionRatio === 0) setInView(false);
      },
      { threshold: THRESHOLDS, rootMargin: ROOT_MARGIN },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}
