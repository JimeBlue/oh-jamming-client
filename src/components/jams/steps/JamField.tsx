type JamFieldProps = {
  label: string;
  /* The message from the resolver, already unwrapped by the caller — steps read
     `errors.title?.message`, which is a string or undefined. */
  error?: string;
  /* Shown only while the field is clean. An error and a hint stacked together
     say two things at once about the same input, and the error is the one that
     needs reading. */
  hint?: React.ReactNode;
  /* A control that belongs to the field rather than to the form — the AI tabs
     are the only one so far. It shares the label's row, which is the one place
     it can go without pushing the input away from the words describing it. */
  action?: React.ReactNode;
  children: React.ReactNode;
};

/* The label / control / message stack, matching the login and register forms:
   daisyUI's `fieldset` with a `fieldset-legend` above and a `fieldset-label`
   below. Pulled out here because the builder repeats it a dozen times across
   eight steps, where the auth forms repeat it five times in one file. */
export default function JamField({
  label,
  error,
  hint,
  action,
  children,
}: JamFieldProps) {
  return (
    /* `aria-label` only in the action case, where the name can't come from a
       legend — see below. Both branches leave the group named. */
    <fieldset className="fieldset" aria-label={action ? label : undefined}>
      {action ? (
        /* A span rather than a `<legend>`, because a legend has to be the
           fieldset's first child and this needs a flex row around it to put the
           tabs at the other end. `.fieldset-legend` is styling, so it moves
           across; the accessible name moves to the `aria-label` above rather
           than being dropped.

           `flex-wrap` because the two tabs and a label like "Session overview*"
           don't share 320px — at that width the tabs take their own line rather
           than squeezing the label to three characters. */
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="fieldset-legend">{label}</span>
          {action}
        </div>
      ) : (
        <legend className="fieldset-legend">{label}</legend>
      )}

      {children}

      {error ? (
        /* role="alert" so a screen reader hears it when it appears after a
           failed Next, rather than only when the field is next focused. */
        <p role="alert" className="fieldset-label text-error">
          {error}
        </p>
      ) : (
        hint && <p className="fieldset-label">{hint}</p>
      )}
    </fieldset>
  );
}
