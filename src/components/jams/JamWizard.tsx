'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, type FieldErrors } from 'react-hook-form';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa6';
import { IoInformationCircle } from 'react-icons/io5';

import { JAM_STEPS, JAM_STEP_FIELDS, type JamStepId } from '@/config/jamSteps';
import { clearJamDraft, readJamDraft, writeJamDraft } from '@/lib/jamDraft';
import {
  emptyJamForm,
  jamFormSchema,
  toJamSessionPayload,
  type JamFormValues,
} from '@/schemas/jamSession';
import { ApiError } from '@/services/api';
import { createJamSession } from '@/services/jamSessions';
import JamStepBar from './JamStepBar';

/* The shell: progress bar, one card, and the two buttons that move between the
   eight steps.

   The step index lives in component state rather than in the URL, and that is
   the decision this file rests on. A route per step would advertise something
   the API can't back — there is no draft endpoint, nothing is stored until the
   single POST at the end, so /jams/new/step-5 would be a link that looks
   resumable and isn't. One route, one form, eight views over it.

   One form, too, not eight. Every step registers into the same react-hook-form
   instance, which is what makes the last step able to show a preview of fields
   entered six steps earlier, and what makes the final submit a single object
   rather than a merge of eight partial ones. */
export default function JamWizard() {
  const router = useRouter();

  /* Read once, in the initialiser, so the restored step is on screen from the
     very first paint. Doing it in an effect instead would render step 1 and then
     jump to step 5 a frame later, which reads as a glitch rather than as the app
     remembering something. */
  const [draft] = useState(readJamDraft);
  const [stepIndex, setStepIndex] = useState(() => draft?.stepIndex ?? 0);

  const form = useForm<JamFormValues>({
    resolver: zodResolver(jamFormSchema),
    /* A complete object either way — see the note on `emptyJamForm`. Fields that
       start undefined make React flip the input from uncontrolled to controlled
       on the first keystroke, and leave the schema's cross-field rules unrun. */
    defaultValues: draft?.values ?? emptyJamForm(),
  });

  const {
    handleSubmit,
    trigger,
    getValues,
    subscribe,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const step = JAM_STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === JAM_STEPS.length - 1;

  /* Mirror the form into sessionStorage on every change, and on every step move.

     `subscribe` rather than `watch`: watching would re-render the whole wizard —
     and with it every field on the current step — on each keystroke, which is
     precisely the cost react-hook-form exists to avoid. This side-steps React
     entirely and just writes.

     Cheap enough to do without debouncing: the draft is a few kilobytes, and a
     timer can lose the last keystroke before a reload — the exact moment this
     exists for. */
  useEffect(() => {
    writeJamDraft({ stepIndex, values: getValues() });

    return subscribe({
      formState: { values: true },
      callback: ({ values }) => writeJamDraft({ stepIndex, values }),
    });
  }, [subscribe, getValues, stepIndex]);

  /* Step six is long enough to leave the viewport well down the page, and
     without this the next step opens scrolled into its own middle. */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stepIndex]);

  const goBack = () => setStepIndex((index) => Math.max(0, index - 1));

  /* Only this step's fields, not the whole form. Someone on step 2 hasn't chosen
     a genre yet and shouldn't be told about it — the fields they haven't reached
     aren't mistakes, they're the rest of the wizard. */
  const goNext = async () => {
    if (!step) return;

    const stepIsValid =
      PLACEHOLDER_STEPS.has(step.id) || (await trigger(JAM_STEP_FIELDS[step.id]));

    if (!stepIsValid) return;

    setStepIndex((index) => Math.min(JAM_STEPS.length - 1, index + 1));
  };

  const onValid = async (values: JamFormValues) => {
    try {
      await createJamSession(toJamSessionPayload(values));

      /* Only once the session exists. Clearing before the request would lose the
         draft on a failure, which is the one moment it's most needed. */
      clearJamDraft();

      /* replace, not push: going back to a wizard whose contents have just been
         published and cleared is a dead end. */
      router.replace('/my-backstage');
    } catch (error) {
      setError('root', { message: publishErrorMessage(error) });
    }
  };

  /* A failed publish usually means a field several steps back — the button is on
     step 8, the problem is on step 3, and an error rendered on a screen nobody is
     looking at is the same as no error at all. So walk to it. */
  const onInvalid = (formErrors: FieldErrors<JamFormValues>) => {
    const firstBrokenStep = JAM_STEPS.findIndex(({ id }) =>
      JAM_STEP_FIELDS[id].some((field) => field in formErrors),
    );

    if (firstBrokenStep >= 0) setStepIndex(firstBrokenStep);
  };

  if (!step) return null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <JamStepBar currentIndex={stepIndex} />

      {/* FormProvider rather than prop-drilling: each step is its own component
          and reaches the form with useFormContext, so adding a step doesn't mean
          threading `register` and `control` down through this file. */}
      <FormProvider {...form}>
        {/* onSubmit is wired to the form element as well as to the button, so the
            Enter key inside a text input publishes rather than silently doing
            nothing — and noValidate keeps the browser's own bubbles out of it, so
            every message the venue sees comes from the same schema. */}
        <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
          <div className="mt-8 rounded-box bg-base-100 p-6 shadow-xl sm:p-10">
            <h1 className="font-heading text-2xl sm:text-3xl">{step.title}</h1>
            <p className="mt-2 text-sm opacity-70">{step.description}</p>

            <div className="mt-8">
              <StepPlaceholder stepId={step.id} />
            </div>
          </div>

          {errors.root && (
            <div role="alert" className="alert alert-error mt-6">
              <span>{errors.root.message}</span>
            </div>
          )}

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

            {isLastStep ? (
              <button
                type="submit"
                disabled={isSubmitting || PLACEHOLDER_STEPS.size > 0}
                className="btn btn-secondary gap-2 font-bold"
              >
                {isSubmitting && <span className="loading loading-spinner" />}
                {isSubmitting ? 'Publishing…' : 'Publish jam session'}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="btn btn-secondary gap-2 font-bold"
              >
                Go to the next step
                <FaArrowRight className="size-4" />
              </button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}

const publishErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) {
    return 'Something went wrong. Please try again.';
  }

  /* The access token is renewed automatically (see services/api), so a 401 here
     means the session itself is gone — logged out in another tab, or a refresh
     token the API decided not to honour. Nothing on this screen can fix it. */
  if (error.status === 401) {
    return 'Your session has expired. Please log in again — your draft is saved in this tab.';
  }

  /* The API's own message, which for a 400 names the field it rejected. It
     shouldn't be reachable: everything it checks is checked here first, so a 400
     means the two schemas have drifted. */
  return error.message;
};

/* Temporary. Every step but the first gets its real fields in a later phase, and
   this whole component goes away when the last one lands. Kept in one place so
   deleting it is a single change rather than a hunt. */
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

/* Also temporary, and the counterpart to the placeholder above: a step with no
   inputs on it has nothing to validate, so Next would otherwise refuse to move
   past step 2 forever. Ids come out of this set as each step gets its real
   fields, and the publish button turns on when it empties. */
const PLACEHOLDER_STEPS = new Set<JamStepId>([
  'image',
  'basics',
  'when',
  'overview',
  'slots',
  'instruments',
  'tags',
  'preview',
]);
