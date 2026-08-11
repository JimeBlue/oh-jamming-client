'use client';

import { useEffect, useRef, useState } from 'react';
import { FaXmark } from 'react-icons/fa6';

import JamField from './JamField';

/* Where a link's address is typed, for the editor's link button.

   A native `<dialog>` rather than a positioned div: `showModal()` brings the
   focus trap, the Escape key, the backdrop and the inert page behind it, all of
   which would otherwise be hand-written and half-wrong. daisyUI's `modal`
   classes are built for exactly this element.

   It lives inside the wizard's `<form>`, which is why nothing in here is a form
   of its own and every button says `type="button"` — a nested form is invalid
   HTML, and a stray submit would publish the session. */

/* Mounted only while it is open — the editor renders it or it doesn't, rather
   than passing an `open` flag. That makes every reopening a fresh component with
   an empty field and no stale error, without an effect reaching back to reset
   state it already owns. */
type LinkDialogProps = {
  onCancel: () => void;
  /* Only ever called with a normalised, http(s) address. */
  onSave: (href: string) => void;
};

const INVALID = 'That doesn’t look like a web address. Try https://example.com';

/* Returns the address to store, or null if it isn't one.

   Two jobs. The first is kindness: someone typing "ohjamming.com" means
   https://ohjamming.com, and refusing them over a missing prefix is pedantry.
   The second is the safety one — `javascript:alert(1)` is a valid URL and an XSS
   payload, so anything carrying a scheme that isn't http or https is refused
   rather than quietly repaired into something else. */
const toHref = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const isWeb = /^https?:\/\//i.test(trimmed);

  if (hasScheme && !isWeb) return null;

  try {
    return new URL(isWeb ? trimmed : `https://${trimmed}`).href;
  } catch {
    /* Not a URL at all — spaces in the middle, an empty host. */
    return null;
  }
};

export default function LinkDialog({ onCancel, onSave }: LinkDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  /* `showModal()` is the only way to get the top-layer behaviour — a `<dialog>`
     rendered with the right classes and no call to it is simply display:none.

     The focus is moved by hand because React's `autoFocus` prop can't do it
     here: React focuses at mount, while the dialog is still display:none and
     nothing inside it is focusable, and it sets no `autofocus` attribute for
     `showModal` to find afterwards. The dialog would open with the caret on the
     close button — a modal that appears for the sole purpose of being clicked. */
  useEffect(() => {
    dialogRef.current?.showModal();
    inputRef.current?.focus();
  }, []);

  const save = () => {
    const href = toHref(value);

    if (!href) {
      setError(INVALID);
      return;
    }

    onSave(href);
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      /* Escape closes a modal dialog by itself, without asking React — so the
         editor would go on thinking the dialog was open and its link button
         would stop responding. `close` rather than `cancel` because it fires
         however the dialog was dismissed, not just on the Escape key. */
      onClose={onCancel}
      /* A click on the backdrop lands on the dialog element itself — everything
         visible is inside modal-box, which stops its own clicks here. */
      onClick={(event) => {
        if (event.target === dialogRef.current) onCancel();
      }}
    >
      <div className="modal-box" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="btn btn-circle btn-ghost btn-sm absolute right-3 top-3"
        >
          <FaXmark className="size-4" />
        </button>

        <h3 className="text-center font-heading text-xl">Add link</h3>

        <div className="mt-4">
          <JamField
            label="Link"
            error={error ?? undefined}
            hint="Enter a web address (e.g. https://example.com)"
          >
            <input
              ref={inputRef}
              type="url"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                /* Clear on the first keystroke of the fix rather than making
                   them press Save again to find out whether it worked. */
                setError(null);
              }}
              /* Enter inside a dialog that sits in the wizard's form would submit
                 the wizard — on the last step, that publishes. Here it means
                 Save, which is what pressing Enter in a one-field dialog means
                 everywhere else. */
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                save();
              }}
              placeholder="https://"
              aria-invalid={error ? true : undefined}
              className={`input w-full ${error ? 'input-error' : ''}`}
            />
          </JamField>
        </div>

        <div className="modal-action justify-center">
          <button type="button" onClick={save} className="btn btn-primary font-bold">
            Save
          </button>
          <button type="button" onClick={onCancel} className="btn btn-outline font-bold">
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
