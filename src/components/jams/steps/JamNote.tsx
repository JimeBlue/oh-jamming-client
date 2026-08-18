import { FiInfo } from 'react-icons/fi';

/* The pale panel at the foot of a step: why the fields above it are worth
   spending time on, said once, after them rather than as a preamble to them.

   Deliberately not `alert-info` — `--color-info` is the brand indigo, so that
   class is a solid indigo block, which is far more voice than a note under a
   form needs. 12px in the thinned navy the field hints use, so it reads as the
   quietest thing in the card, which is what it is. */
export default function JamNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-box border border-royal-blue/15 bg-pale-blue p-4">
      {/* aria-hidden: it names nothing the sentence doesn't. */}
      <span
        aria-hidden
        className="grid size-7 shrink-0 place-items-center rounded-field bg-cyan-blue text-white"
      >
        <FiInfo className="size-4" />
      </span>
      <p className="text-xs font-normal text-brand-navy/60">{children}</p>
    </div>
  );
}
