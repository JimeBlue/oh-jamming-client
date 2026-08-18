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
    /* Wider on the last step, and only there. Every other step is a column of
       fields, which gets worse the wider it runs; the preview is the musician's
       page, and that page is 77.5rem with a two-column grid that only opens at
       `lg`. Held to 56rem the venue would approve the phone layout and publish
       the desktop one — which is the one failure this step exists to prevent.

       The step bar and the Back/Publish row widen with it. That reads as the
       last step being a different kind of screen, which it is. */
    <div
      className={`mx-auto w-full px-4 py-10 sm:px-6 lg:px-8 ${
        isLastStep ? 'max-w-[77.5rem]' : 'max-w-4xl'
      }`}
    >
      <JamStepBar currentIndex={stepIndex} />

      {/* FormProvider rather than prop-drilling: each step is its own component
          and reaches the form with useFormContext, so adding a step doesn't mean
          threading `register` and `control` down through this file. */}
      <FormProvider {...form}>
        {/* noValidate hands validation entirely to zod — without it the browser's
            own bubbles fire first on the date and time inputs, and the venue gets
            two different messages for one mistake in two different styles. */}
        <form onSubmit={onFormSubmit} noValidate>
          {/* `overflow-hidden` is what lets the navy band be square-edged and
              still sit inside the card's 1rem corner — the alternative is
              rounding the band's top two corners by hand and keeping the two
              radii in sync forever. `jam-card` is the hook for the field styling
              in globals.css; see the note there. */}
          <div className="jam-card mt-8 overflow-hidden rounded-box bg-base-100 shadow-xl">
            {/* The card's own header, in the same navy as the bar at the top of
                the screen. It gives the step somewhere to be that isn't the
                first thing above the first field: on white, the title, the
                description and the label of field one were three lines of dark
                text at three sizes, and which of them was the heading had to be
                worked out from the sizes. */}
            <div className="bg-brand-navy px-6 py-8 sm:px-10">
              {/* The step's name from the progress bar, repeated. Not
                  decoration: the bar is eight circles wide and its labels are
                  10px, so this is where "which step am I on" is legible — and it
                  is the same string, from the same list, so the two can't
                  disagree. Lime is the one colour that survives being 12px on
                  this navy. */}
              <p className="font-display text-xs font-bold tracking-[0.18em] text-brand-green uppercase">
                {step.shortLabel}
              </p>

              {/* Space Grotesk on every step, not just the preview. It was the
                  preview's alone because everything under it there is the
                  musician's page, set in `font-display` throughout — but the
                  same argument holds one step up: Changa One is the site's
                  poster face, and eight screens of it over a form reads as
                  shouting the field labels rather than titling them. `font-bold`
                  is not optional — the display face is variable, so without it
                  this lands at 400. */}
              <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {step.title}
              </h1>
              {/* `in` rather than `step.description &&`: `JAM_STEPS` is
                  `as const satisfies`, so the preview step's member of the union
                  has no such key at all and a property access doesn't
                  typecheck. */}
              {'description' in step && (
                <p className="mt-2 text-sm text-white/70">{step.description}</p>
              )}
            </div>

            <div className="p-6 sm:p-10">
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
                /* Written out rather than `btn-outline`, which takes its colour
                   from the button's text and would need a second class to say
                   which colour anyway.
                   The same royal blue as the button opposite, hollow rather than
                   filled: back and forward are one control in two halves, and
                   giving the two directions two different hues said they were
                   two unrelated choices. Weight carries which one is the way on.

                   Transparent at rest — the page shows through, not a white fill
                   — and solid on hover, which is the exact inverse of the button
                   opposite. The two trade places under the cursor, so the row
                   never holds two solid buttons at once. */
                className="btn gap-2 border-royal-blue bg-transparent font-bold text-royal-blue shadow-none transition-colors hover:border-royal-blue hover:bg-royal-blue hover:text-white"
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
                /* Hollows out on hover rather than darkening — the inverse of
                   Back beside it, which fills. The pair moves rather than just
                   lighting up, which is the one thing that makes a hover state
                   read on two buttons sitting in the same row.
                   `disabled:` keeps the filled look while publishing, so the
                   spinner isn't sitting in an outline that looks switched off. */
                className="btn gap-2 border-royal-blue bg-royal-blue font-bold text-white shadow-none transition-colors hover:bg-transparent hover:text-royal-blue disabled:border-royal-blue disabled:bg-royal-blue disabled:text-white"
              >
                {/* The same arrow the Next button carries, because this is the
                    same gesture — forward, out of the wizard. It replaced the
                    guitar-player glyph, which was the one illustration in the
                    flow and read as decoration on the one button that commits.

                    Swapped out entirely while submitting: the spinner is the
                    thing to look at then. */}
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner" />
                    Publishing…
                  </>
                ) : (
                  <>
                    Publish jam
                    <FaArrowRight className="size-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                key="next"
                type="button"
                onClick={goNext}
                /* Solid at rest, hollowed out on hover — the same way Publish
                   behaves in the same corner. Hovering takes weight off the
                   forward button rather than adding it, which is what keeps the
                   row from having two solid buttons in it at any moment.
                   Royal blue written out rather than `btn-primary`: the wizard's
                   indigo is the app chrome, and this row belongs to the form. */
                className="btn gap-2 border-royal-blue bg-royal-blue font-bold text-white shadow-none transition-colors hover:bg-transparent hover:text-royal-blue"
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
