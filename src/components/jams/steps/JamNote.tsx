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
      {/* The glyph alone, no tile behind it: a filled square is the weight of a
          button, and this panel is the quietest thing in the card. aria-hidden
          because it names nothing the sentence doesn't. */}
      <FiInfo aria-hidden className="mt-0.5 size-4 shrink-0 text-cyan-blue" />
      <p className="text-xs font-normal text-brand-navy/60">{children}</p>
    </div>
  );
}
