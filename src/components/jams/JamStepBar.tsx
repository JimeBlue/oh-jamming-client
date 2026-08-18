import { FaCheck } from 'react-icons/fa6';

import { JAM_STEPS } from '@/config/jamSteps';

type JamStepBarProps = {
  currentIndex: number;
};

/* Hand-rolled rather than daisyUI's `.steps`, for one reason: the current step
   is an outlined circle, not a filled one, and daisyUI draws its circles with
   ::before content that can't take a ring without a fight. Eight steps also sit
   badly in its equal-column grid. This is about forty lines and does exactly
   what the design asks.

   Set in the body face rather than in either display one. Changa One's single
   heavy weight can't tell the current label from the seven around it at 12px,
   which is the bar's whole job; Space Grotesk can, but it is the voice of the
   headings, and putting it on eight 12px labels made the bar compete with the
   title under it. Inter is what small text is set in everywhere else. */
export default function JamStepBar({ currentIndex }: JamStepBarProps) {
  const current = JAM_STEPS[currentIndex];

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Below md there is no room for eight labels, so the position is stated
          in words instead. Not merely decorative — it's the only place the step
          name appears at that width. */}
      <p className="text-center text-sm md:hidden">
        <span className="opacity-60">
          Step {currentIndex + 1} of {JAM_STEPS.length}
        </span>
        {current && <span className="ml-2">{current.shortLabel}</span>}
      </p>

      <ol aria-label="Jam session progress" className="mt-3 flex items-start md:mt-0">
        {JAM_STEPS.map((step, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li
              key={step.id}
              /* flex-1 makes every item the same width, which is what lets the
                 connector below reach exactly from one circle's centre to the
                 next with a plain w-full. */
              className="relative flex flex-1 flex-col items-center"
              aria-current={isCurrent ? 'step' : undefined}
            >
              {index > 0 && (
                /* Anchored at right-1/2 — this item's centre — and stretched a
                   full item width leftwards, landing on the previous centre.
                   Sits behind the circles, which carry z-10. */
                <span
                  aria-hidden="true"
                  className={`absolute right-1/2 top-3 h-0.5 w-full ${
                    index <= currentIndex ? 'bg-accent' : 'bg-base-300'
                  }`}
                />
              )}

              <span
                className={`relative z-10 grid size-6 place-items-center rounded-full ${
                  isDone
                    ? 'bg-accent text-accent-content'
                    : isCurrent
                      ? 'bg-base-100 ring-2 ring-primary'
                      : 'bg-base-300'
                }`}
              >
                {isDone && <FaCheck className="size-3" />}
                {isCurrent && (
                  <span className="size-2.5 rounded-full bg-neutral" />
                )}
              </span>

              <span
                /* Medium rather than bold on the current step. The circles
                   above already carry the state in colour and the two are read
                   together — a bold label under a lit circle was the same thing
                   said twice, and loudly. The contrast against 70% and 40% is
                   still the thing that picks it out. */
                className={`mt-2 hidden px-1 text-center text-xs leading-tight md:block ${
                  isCurrent
                    ? 'font-medium'
                    : isDone
                      ? 'opacity-70'
                      : 'opacity-40'
                }`}
              >
                {step.shortLabel}
              </span>

              {/* The circles alone carry the state visually. Screen readers get
                  it in words instead, since "lime with a tick" doesn't
                  translate. */}
              <span className="sr-only">
                {isDone ? 'completed' : isCurrent ? 'current step' : 'not started'}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
