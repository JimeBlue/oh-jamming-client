'use client';

import { useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa6';
import { IoInformationCircle } from 'react-icons/io5';

import { JAM_STEPS } from '@/config/jamSteps';
import JamStepBar from './JamStepBar';

/* The shell: progress bar, one card, and the two buttons that move between the
   eight steps.

   The step index lives in component state rather than in the URL, and that is
   the decision this file rests on. A route per step would advertise something
   the API can't back — there is no draft endpoint, nothing is stored until the
   single POST at the end, so /jams/new/step-5 would be a link that looks
   resumable and isn't. One route, one form, eight views over it. */
export default function JamWizard() {
  const [stepIndex, setStepIndex] = useState(0);

  const step = JAM_STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === JAM_STEPS.length - 1;

  /* Step six is long enough to leave the viewport well down the page, and
     without this the next step opens scrolled into its own middle. */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stepIndex]);

  const goBack = () => setStepIndex((index) => Math.max(0, index - 1));

  const goNext = () =>
    setStepIndex((index) => Math.min(JAM_STEPS.length - 1, index + 1));

  if (!step) return null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <JamStepBar currentIndex={stepIndex} />

      <div className="mt-8 rounded-box bg-base-100 p-6 shadow-xl sm:p-10">
        <h1 className="font-heading text-2xl sm:text-3xl">{step.title}</h1>
        <p className="mt-2 text-sm opacity-70">{step.description}</p>

        <div className="mt-8">
          <StepPlaceholder stepId={step.id} />
        </div>
      </div>

      {/* Back is absent rather than disabled on the first step — there is
          nowhere behind it, and a permanently dead button is just noise. The
          empty span keeps the next button pinned right at every width. */}
      <div className="mt-8 flex items-center justify-between gap-4">
        {isFirstStep ? (
          <span />
        ) : (
          <button
            type="button"
            onClick={goBack}
            className="btn btn-outline gap-2 font-bold"
          >
            <FaArrowLeft className="size-4" />
            Back
          </button>
        )}

        <button
          type="button"
          onClick={goNext}
          disabled={isLastStep}
          className="btn btn-secondary gap-2 font-bold"
        >
          {isLastStep ? 'Publish jam session' : 'Go to the next step'}
          {!isLastStep && <FaArrowRight className="size-4" />}
        </button>
      </div>
    </div>
  );
}

/* Temporary. Every step but the first gets its real fields in a later phase,
   and this whole component goes away when the last one lands. Kept in one place
   so deleting it is a single change rather than a hunt. */
const StepPlaceholder = ({ stepId }: { stepId: string }) => {
  if (stepId === 'image') {
    return (
      /* Not daisyUI's `alert alert-info`: this theme's --color-info is the
         brand indigo, which fills the whole box and shouts at someone who is
         only being told a field isn't ready yet. A tinted panel says the same
         thing at the volume it deserves. */
      <div
        role="note"
        className="flex gap-3 rounded-box border border-secondary/40 bg-secondary/10 p-4"
      >
        <IoInformationCircle className="size-6 shrink-0 text-secondary" />
        <p className="text-sm">
          Image upload is still to be built — the API has no field for it yet.
          Carry on to the next step; you&apos;ll be able to add a photo here
          once it&apos;s ready.
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-h-40 place-items-center rounded-box border border-dashed border-base-300 p-6 text-center text-sm opacity-50">
      The fields for this step are coming next.
    </div>
  );
};
