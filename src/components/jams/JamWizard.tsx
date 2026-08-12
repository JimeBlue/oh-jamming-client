'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, type FieldErrors } from 'react-hook-form';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa6';

import { JAM_STEPS, JAM_STEP_FIELDS, type JamStepId } from '@/config/jamSteps';
import { JamImageProvider, useJamImage } from '@/context/JamImageContext';
import { clearJamDraft, readJamDraft, writeJamDraft } from '@/lib/jamDraft';
import {
  emptyJamForm,
  jamFormSchema,
  toJamSessionPayload,
  type JamFormValues,
} from '@/schemas/jamSession';
import { ApiError } from '@/services/api';
import { createJamSession } from '@/services/jamSessions';
import { uploadJamImage } from '@/services/uploads';
import JamStepBar from './JamStepBar';
import BasicsStep from './steps/BasicsStep';
import ImageStep from './steps/ImageStep';
import InstrumentsStep from './steps/InstrumentsStep';
import OverviewStep from './steps/OverviewStep';
import PreviewStep from './steps/PreviewStep';
import SlotsStep from './steps/SlotsStep';
import TagsStep from './steps/TagsStep';
import WhenStep from './steps/WhenStep';

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
   rather than a merge of eight partial ones.

   The photo is the one thing outside that form, because a File can't be written
   to the draft as JSON — `JamImageProvider` holds it, and this wraps the form so
   that step 1, the preview and the publish handler are all looking at the same
   picked file. */
export default function JamWizard() {
  return (
    <JamImageProvider>
      <JamWizardForm />
    </JamImageProvider>
  );
}

function JamWizardForm() {
  const router = useRouter();
  const { file: imageFile } = useJamImage();

  /* Read once, in the initialiser, so the restored step is on screen from the
     very first paint. Doing it in an effect instead would render step 1 and then
     jump to step 5 a frame later, which reads as a glitch rather than as the app
     remembering something. */
  const [draft] = useState(readJamDraft);
  const [stepIndex, setStepIndex] = useState(() => draft?.stepIndex ?? 0);

  const form = useForm<JamFormValues>({
    resolver: zodResolver(jamFormSchema),
    /* Not the default 'onSubmit'. Next validates with `trigger`, which never sets
       `isSubmitted`, so react-hook-form's automatic re-validation-on-change never
       switches on — and a message would sit there in red while the venue is
       typing the very thing that fixes it. 'onTouched' validates a field once it
       has been left, and on every keystroke after that.

       Controls that are clicked rather than typed in — the spot steppers, the
       genre chips — never blur, so they re-validate themselves. */
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

    if (!(await trigger(JAM_STEP_FIELDS[step.id], { shouldFocus: true }))) return;

    setStepIndex((index) => Math.min(JAM_STEPS.length - 1, index + 1));
  };

  const onValid = async (values: JamFormValues) => {
    /* The photo goes up here and nowhere else, which is the point: a venue who
       tries four images before settling on one sends a single file, and a wizard
       abandoned on step 5 sends none. Uploading as each file was picked would be
       kinder to this handler and would litter the image host with every photo
       anyone ever changed their mind about, with nothing to go back and remove
       them.

       Separated from the try below so that a failed upload can say so. Publishing
       stops here: a session that quietly went live without the photo the venue
       chose is worse than one that didn't go live at all. */
    let image: string | undefined;

    if (imageFile) {
      try {
        image = await uploadJamImage(imageFile);
      } catch (error) {
        setError('root', { message: imageErrorMessage(error) });
        return;
      }
    }

    try {
      await createJamSession(toJamSessionPayload(values, image));

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

  /* Enter inside a text field submits the form it's in — which on step 2 would
     mean publishing a session the venue hasn't finished writing. On every step
     but the last, Enter means "next". */
  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!isLastStep) {
      event.preventDefault();
      void goNext();
      return;
    }

    void handleSubmit(onValid, onInvalid)(event);
  };

  if (!step) return null;

  const StepFields = STEP_FIELDS[step.id];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <JamStepBar currentIndex={stepIndex} />

      {/* FormProvider rather than prop-drilling: each step is its own component
          and reaches the form with useFormContext, so adding a step doesn't mean
          threading `register` and `control` down through this file. */}
      <FormProvider {...form}>
        {/* noValidate hands validation entirely to zod — without it the browser's
            own bubbles fire first on the date and time inputs, and the venue gets
            two different messages for one mistake in two different styles. */}
        <form onSubmit={onFormSubmit} noValidate>
          <div className="mt-8 rounded-box bg-base-100 p-6 shadow-xl sm:p-10">
            <h1 className="font-heading text-2xl sm:text-3xl">{step.title}</h1>
            <p className="mt-2 text-sm opacity-70">{step.description}</p>

            <div className="mt-8">
              <StepFields />
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

            {/* The keys are load-bearing, and this is the bug they prevent:
                without them React sees one <button> in one place and reuses the
                DOM node, so the click that moves from step 7 to step 8 flips that
                very node's type from "button" to "submit" mid-dispatch — and the
                browser then runs the click's default action on it and publishes
                the session the venue was on their way to previewing. The preview
                appears for one frame on the way to /my-backstage.

                Two keys say what is actually true: these are different buttons
                that happen to sit in the same corner. React unmounts one and
                mounts the other, and a click that lands on a node no longer in
                the document submits nothing. */}
            {isLastStep ? (
              <button
                key="publish"
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary gap-2 font-bold"
              >
                {isSubmitting && <span className="loading loading-spinner" />}
                {isSubmitting ? 'Publishing…' : 'Publish jam session'}
              </button>
            ) : (
              <button
                key="next"
                type="button"
                onClick={goNext}
                className="btn btn-primary gap-2 font-bold"
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

/* Every one of these ends the same way — nothing was published — because that is
   the fact the venue needs before they decide whether to remove the photo and try
   again. The 503 gets its own sentence: no amount of picking a different image
   will fix a server with no image host configured. */
const imageErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) {
    return 'Your photo couldn’t be uploaded, so nothing was published. Check your connection and try again.';
  }

  if (error.status === 503) {
    return 'Image upload isn’t available right now, so nothing was published. Remove the photo on step 1 to publish without one.';
  }

  if (error.status === 401) {
    return 'Your session has expired. Please log in again — your draft is saved in this tab.';
  }

  return `${error.message}. Nothing was published — fix the photo on step 1 and try again.`;
};

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

/* Which component owns each step's fields. Keyed by id rather than positional,
   so reordering JAM_STEPS can't quietly pair a heading with the wrong inputs.

   Every one of them registers into the same form through useFormContext, and
   react-hook-form keeps the values of fields that are no longer mounted — which
   is what lets a venue walk back to step 3, fix a time, and find step 6 exactly
   as they left it. */
const STEP_FIELDS: Record<JamStepId, React.ComponentType> = {
  image: ImageStep,
  basics: BasicsStep,
  when: WhenStep,
  overview: OverviewStep,
  slots: SlotsStep,
  instruments: InstrumentsStep,
  tags: TagsStep,
  preview: PreviewStep,
};
