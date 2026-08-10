'use client';

import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

type PasswordInputProps = React.ComponentPropsWithRef<'input'> & {
  /* Drives the red border. Named `invalid` rather than taking the class
     directly so callers can't accidentally style one field differently. */
  invalid?: boolean;
};

/* A password field with a show/hide toggle. Revealing a password is just
   flipping the input's type between 'password' and 'text'.

   In daisyUI 5 the `input` class goes on the wrapping <label>, not the <input>,
   which is what lets the eye button sit inside the field's border rather than
   beside it. (`input-bordered` from daisyUI 4 no longer exists — plain `input`
   already draws the border.)

   Everything else is spread through, so react-hook-form's register() — name,
   onChange, onBlur, ref — lands on the real input. React 19 passes ref as an
   ordinary prop, so no forwardRef is needed. */
export default function PasswordInput({
  invalid,
  ...inputProps
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className={`input w-full ${invalid ? 'input-error' : ''}`}>
      <input
        {...inputProps}
        type={visible ? 'text' : 'password'}
        /* grow fills the wrapper. The bracket utilities suppress Edge's and
           Safari's own built-in reveal icons, which would otherwise sit next to
           ours and give the field two eyes. */
        className="grow [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
      />

      <button
        type="button"
        onClick={() => setVisible((isVisible) => !isVisible)}
        /* aria-pressed makes this a toggle rather than a plain button, so a
           screen reader announces the current state and not just the label.
           Deliberately left in the tab order: someone typing a password blind
           is exactly who most needs to check what they typed. */
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="cursor-pointer opacity-70 transition-opacity hover:opacity-100"
      >
        {visible ? <FiEyeOff size={18} /> : <FiEye size={18} />}
      </button>
    </label>
  );
}
