'use client';

import { useId, useState } from 'react';
import { useController, useWatch } from 'react-hook-form';
import { FaPencil, FaWandMagicSparkles } from 'react-icons/fa6';
import { LuSparkles } from 'react-icons/lu';

import { useJamForm } from '@/hooks/useJamForm';
import { ApiError } from '@/services/api';
import { MAX_NOTES_CHARS } from '@/services/ai';
import JamField from './JamField';

/* Two tabs over one field: write it, or describe it and have it written.

   The shape worth being careful about is that there is still exactly one value
   in the form. The tabs are two ways of filling it, not two versions of it — the
   moment there are two, they disagree about which one gets published.

   Shared by the summary on step 2 and the overview on step 4, which differ in
   almost everything visible (a textarea against a markdown editor, a one-line
   pitch against six paragraphs) and in nothing about how the tabs behave. Kept
   in one place because the parts that are easy to get subtly different — what
   happens to the notes on success, which tab an error leaves you on, whether the
   button comes back — are exactly the parts a venue would notice disagreeing
   between two steps of the same wizard. */

/* Only the two client-only note fields, so a caller can't point this at a field
   that gets published. */
type NotesField = 'summaryNotes' | 'overviewNotes';
/* Only the two the wizard actually generates, and both hold a string — which is
   what lets `setValue` below take either without a cast. */
type TargetField = 'summary' | 'overview';

type AiAssistedFieldProps = {
  label: string;
  error?: string;
  /* Shown under the manual tab. A node rather than a string because every caller
     so far pairs a sentence with a character count. */
  manualHint: React.ReactNode;
  notesHint: string;
  notesPlaceholder: string;
  notesName: NotesField;
  targetName: TargetField;
  generate: (notes: string) => Promise<string>;
  /* The manual control. Handed a number that changes on each generation, for
     controls that read their value only at mount — see the note on the key. */
  renderManual: (generationId: number) => React.ReactNode;
};

type Tab = 'manual' | 'ai';

/* A list rather than two hand-written buttons: the pair has to be identical in
   everything but its label, its icon and which of them is lit, and two copies of
   nine classes is where that stops being true.

   "Generate with AI" is one string now, where it used to be "Generate with" plus
   a badge carrying the word AI — the badge needed an `aria-label` beside it to
   stop screen readers announcing the fragment, and the icon says the same thing
   without a second name to keep in sync. */
const TABS = [
  { id: 'manual', label: 'Enter manually', Icon: FaPencil, weight: 'font-bold' },
  /* Lighter than its neighbour, in the lettering and in the icon's strokes
     (lucide is drawn at 2px on a 24px grid where the solid fa6 pencil has no
     strokes at all). Writing it yourself is the primary way to fill this field;
     the model is the offer beside it, and an offer set in the same weight as the
     thing it sits next to reads as the recommendation. */
  { id: 'ai', label: 'Generate with AI', Icon: LuSparkles, weight: 'font-medium' },
] as const satisfies readonly {
  id: Tab;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  weight: string;
}[];

export default function AiAssistedField({
  label,
  error,
  manualHint,
  notesHint,
  notesPlaceholder,
  notesName,
  targetName,
  generate,
  renderManual,
}: AiAssistedFieldProps) {
  const { control, setValue } = useJamForm();

  /* Both instances of this component are on screen in the same wizard, so the
     tab/panel ids have to be unique per instance rather than per component. */
  const fieldId = useId();

  const { field: notes } = useController({ control, name: notesName });

  /* Only to decide whether generating would destroy something. Scoped to the one
     field, so typing in it doesn't re-render the step around this. */
  const currentValue = useWatch({ control, name: targetName });

  const [tab, setTab] = useState<Tab>('manual');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  /* Bumped on every successful generation, and passed to `renderManual` to use
     as a `key`.

     A control like `MarkdownEditor` seeds itself from its initial value once, at
     mount, and never reads it again — feeding a value back into a text editor on
     every keystroke is how the caret ends up at position 0 mid-word. That is
     right for typing and wrong for this: text arriving from outside the control
     would never appear. Changing the key remounts it, which is the one honest
     way to say "this is different content now" to a component built that way. A
     plain registered `<textarea>` ignores this and updates on its own.

     Deliberately not bumped on tab switches. Both panels stay mounted — daisyUI
     hides with CSS — so switching back and forth leaves the control, and the
     caret, exactly where they were. */
  const [generationId, setGenerationId] = useState(0);

  const trimmedNotes = notes.value.trim();
  const notesTooLong = notes.value.length > MAX_NOTES_CHARS;
  const canGenerate = trimmedNotes.length > 0 && !notesTooLong && !isGenerating;

  const runGenerate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const generated = await generate(trimmedNotes);

      setValue(targetName, generated, { shouldDirty: true, shouldValidate: true });
      setGenerationId((id) => id + 1);

      /* Straight to the control, because what came back is a draft rather than
         an answer — the venue's next move is to read it and change it, and
         landing on the tab that can't be typed in would hide that. The notes
         stay behind here, so a second take is: switch back, tweak, generate. */
      setTab('manual');
    } catch (caught) {
      setGenerateError(generateErrorMessage(caught));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <JamField
      label={label}
      error={error}
      hint={
        tab === 'manual'
          ? manualHint
          : notesHintWithCount(notesHint, notes.value.length, notesTooLong)
      }
      /* A segmented control on the label's row rather than daisyUI's lifted
         tabs above a bordered panel. The panel was a second card inside the
         card, with its own edge a few pixels in from the real one; this way the
         inputs sit on the card like every other step's do, and the only thing
         the tabs draw is themselves.

         `role="tablist"` with real buttons rather than daisyUI's radio-input
         form: generating has to move the venue to the other tab, and a radio set
         can only be moved by clicking it.

         Every `type="button"` here is load-bearing. A bare button inside this
         form is a submit button, and submitting means walking to the next step
         mid-sentence. */
      action={
        <div
          role="tablist"
          className="flex items-center gap-1 rounded-field bg-pale-blue p-1"
        >
          {TABS.map(({ id, label: tabLabel, Icon, weight }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`${fieldId}-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`${fieldId}-panel-${id}`}
              /* The selected one is the only thing in the pair carrying a fill,
                 which is what makes "which of these am I in" answerable without
                 reading either label. The other stays on the trough and takes
                 the same blue in text on hover — the pointer says what the click
                 would do before the click. */
              className={`btn btn-sm gap-2 border-0 shadow-none sm:btn-md ${weight} ${
                tab === id
                  ? 'bg-royal-blue text-white hover:bg-royal-blue'
                  : 'bg-transparent text-brand-navy hover:bg-transparent hover:text-royal-blue'
              }`}
              onClick={() => setTab(id)}
            >
              <Icon className="size-4" />
              {tabLabel}
            </button>
          ))}
        </div>
      }
    >
      {/* Both panels stay mounted and one is `hidden`, rather than rendering
          only the selected one: switching tabs and switching back has to leave
          the notes, the caret and the scroll position where they were. Unmounting
          would throw all three away, and the notes are not in the form. */}
      <div
        role="tabpanel"
        id={`${fieldId}-panel-manual`}
        aria-labelledby={`${fieldId}-tab-manual`}
        hidden={tab !== 'manual'}
      >
        {renderManual(generationId)}
      </div>

      <div
        role="tabpanel"
        id={`${fieldId}-panel-ai`}
        aria-labelledby={`${fieldId}-tab-ai`}
        hidden={tab !== 'ai'}
      >
        <textarea
          {...notes}
          disabled={isGenerating}
          rows={7}
          className={`textarea w-full ${notesTooLong ? 'textarea-error' : ''}`}
          placeholder={notesPlaceholder}
        />

        {/* Under the textarea rather than over it: this is the outcome of the
            button below, and an error above the input it belongs to reads as a
            warning about the whole step. */}
        {generateError && (
          <p role="alert" className="mt-2 text-sm text-error">
            {generateError}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={runGenerate}
            disabled={!canGenerate}
            className="btn gap-2 border-royal-blue bg-royal-blue font-bold text-white shadow-none transition-colors hover:bg-transparent hover:text-royal-blue"
          >
            {isGenerating ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <FaWandMagicSparkles className="size-4" />
            )}
            {isGenerating ? 'Writing…' : 'Generate'}
          </button>

          {/* Said once, before the click rather than after it. Someone who has
              already written something and is idly trying the other tab
              deserves to know it will be replaced while they can still choose
              not to. */}
          {currentValue.trim() && !isGenerating && (
            <span className="text-sm opacity-70">
              This replaces what’s in the manual tab.
            </span>
          )}
        </div>
      </div>
    </JamField>
  );
}

/* The notes tab's own hint, with its own counter — the manual tab's is passed in
   because only the caller knows what its field is measured against. */
const notesHintWithCount = (hint: string, length: number, tooLong: boolean) => (
  <span className="flex w-full justify-between gap-4">
    <span>{hint}</span>
    <span className={tooLong ? 'text-error' : 'opacity-60'}>
      {length}/{MAX_NOTES_CHARS}
    </span>
  </span>
);

/* Every one of these leaves the venue somewhere to go, because there always is
   somewhere: the manual tab has worked since phase 2 and needs no model, no
   network and no quota. A generation that fails costs nothing but the click. */
const generateErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) {
    return 'That didn’t reach the server. Check your connection, or write it in the other tab.';
  }

  if (error.status === 503) {
    return 'AI generation isn’t available right now. Write this in the other tab.';
  }

  if (error.status === 401) {
    return 'Your session has expired. Please log in again — your draft is saved in this tab.';
  }

  /* 429 from the rate limiter or from the quota, and 502 from the model itself.
     The API writes a usable sentence for each — "try again in a few minutes, or
     write this yourself" — so repeating it here would only make the two drift. */
  return error.message;
};
