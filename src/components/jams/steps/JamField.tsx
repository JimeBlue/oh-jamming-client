type JamFieldProps = {
  label: string;
  /* The message from the resolver, already unwrapped by the caller — steps read
     `errors.title?.message`, which is a string or undefined. */
  error?: string;
  /* Shown only while the field is clean. An error and a hint stacked together
     say two things at once about the same input, and the error is the one that
     needs reading. */
  hint?: React.ReactNode;
  children: React.ReactNode;
};

/* The label / control / message stack, matching the login and register forms:
   daisyUI's `fieldset` with a `fieldset-legend` above and a `fieldset-label`
   below. Pulled out here because the builder repeats it a dozen times across
   eight steps, where the auth forms repeat it five times in one file. */
export default function JamField({ label, error, hint, children }: JamFieldProps) {
  return (
    <fieldset className="fieldset">
      <legend className="fieldset-legend">{label}</legend>

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
