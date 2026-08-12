'use client';

import { useState } from 'react';
import { useController, useWatch } from 'react-hook-form';
import { FaWandMagicSparkles } from 'react-icons/fa6';
import { HiOutlineSparkles } from 'react-icons/hi';

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
    <JamField label={label} error={error} hint={tab === 'manual' ? manualHint : notesHintWithCount(notesHint, notes.value.length, notesTooLong)}>
      {/* `role="tablist"` with real buttons rather than daisyUI's radio-input
          form: generating has to move the venue to the other tab, and a radio set
          can only be moved by clicking it. `aria-selected` is what daisyUI 5
          reads to show the matching panel, so the accessible state and the
          visible one are the same attribute rather than two that can drift.

          `tabs-sm` below 640px, because at 375px the two labels otherwise don't
          fit on one line — and this list has to hold one line. The margin is
          about 9px, so a longer label on either tab needs re-measuring rather
          than assuming. daisyUI lays the panel out as a flex sibling that wraps
          onto its own row, so a tab list that wraps puts the lifted tab on one
          row and the panel it is drawn as attached to under another, which reads
          as a broken border rather than as two tabs. `flex-nowrap` is not the fix
          and makes it worse: it keeps the panel on the tabs' line and the whole
          card scrolls sideways.

          Every `type="button"` here is load-bearing. A bare button inside this
          form is a submit button, and submitting means walking to the next step
          mid-sentence. */}
      <div role="tablist" className="tabs tabs-lift tabs-sm sm:tabs-md">
        {/* Inactive is filled rather than transparent — a tab that reads as
            "there is another one of these" rather than as empty space — and
            takes the active colour on hover, so the pointer answers "what
            happens if I click this" before the click. Which tab is which is
            carried by the label and the badge rather than by colour; both go
            primary when active, like the rest of the builder. */}
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'manual'}
          className={`tab whitespace-nowrap font-bold ${
            tab === 'manual'
              ? 'tab-active text-primary'
              : 'bg-base-200 text-base-content hover:text-primary'
          }`}
          onClick={() => setTab('manual')}
        >
          Enter manually
        </button>

        {/* `--tabcontent-radius-ss` pinned to 0. daisyUI rounds the panel's
            top-left whenever the active tab is not the first one, so selecting
            the second tab curves the panel away underneath the first — which
            works when the tabs float above a transparent panel, and does not
            once the inactive tab is filled: the fill stays square while the
            panel beneath it curves, leaving a notch at the card's left edge.
            Square always, so the panel's left edge and the tab list's line up
            whichever tab is selected. */}
        <div
          role="tabpanel"
          className="tab-content border-base-300 bg-base-100 p-4 [--tabcontent-radius-ss:0]"
        >
          {renderManual(generationId)}
        </div>

        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ai'}
          /* Spelled out, because the accessible name computed from the contents
             comes back as "Generate with" — the badge is a styled span and the
             word it carries is doing real work in the label rather than
             decorating it. Without this, a screen reader announces a fragment. */
          aria-label="Generate with AI"
          className={`tab gap-2 whitespace-nowrap font-bold ${
            tab === 'ai'
              ? 'tab-active text-primary'
              : 'bg-base-200 text-base-content hover:text-primary'
          }`}
          onClick={() => setTab('ai')}
        >
          Generate with
          {/* The badge finishes the label — "Generate with" alone is a fragment —
              so unlike the rest of the tab it keeps its colour when the tab is
              inactive, and it can't be dropped at narrow widths the way a purely
              decorative one could. */}
          <span className="badge badge-sm badge-primary gap-1">
            <HiOutlineSparkles className="size-3.5" />
            AI
          </span>
        </button>

        {/* `--tabcontent-radius-ss` pinned to 0. daisyUI rounds the panel's
            top-left whenever the active tab is not the first one, so selecting
            the second tab curves the panel away underneath the first — which
            works when the tabs float above a transparent panel, and does not
            once the inactive tab is filled: the fill stays square while the
            panel beneath it curves, leaving a notch at the card's left edge.
            Square always, so the panel's left edge and the tab list's line up
            whichever tab is selected. */}
        <div
          role="tabpanel"
          className="tab-content border-base-300 bg-base-100 p-4 [--tabcontent-radius-ss:0]"
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
              className="btn btn-primary gap-2 font-bold"
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
