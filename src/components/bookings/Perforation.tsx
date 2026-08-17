/* The tear line down the seam of a ticket — the list card's and the details
   page's, which is why it is here rather than written twice.

   A repeated radial gradient rather than `border-dotted`, for two reasons: a
   dotted border draws its dots at the border's own width, so round ones mean a
   thick border pushing the layout around — and at the 2px that didn't, they were
   invisible on the cyan. This paints the dots at whatever size looks right
   without occupying any space at all.

   5px dots on an 8px pitch, in full white. The gap is smaller than the dot,
   which is what makes this read as a tear line rather than as a dotted rule —
   widen the gap and it turns into punctuation. It was 4px at 0.8 white first,
   and on a 1x screen that is a faint smudge rather than a perforation: the seam
   has to survive being drawn a third of a millimetre wide. */

const DOT = 'radial-gradient(circle, rgb(255 255 255) 45%, transparent 46%)';

export default function Perforation({
  orientation,
  className = '',
}: {
  /* Which way the seam runs — a ticket torn side to side has its stub below,
     which is what the details page does on a phone. */
  orientation: 'vertical' | 'horizontal';
  /* Where it sits. The caller owns the position, because only it knows which
     edge of which half is the seam, and at which widths. */
  className?: string;
}) {
  const vertical = orientation === 'vertical';

  return (
    <span
      aria-hidden
      className={`absolute ${vertical ? 'w-1' : 'h-1'} ${className}`}
      style={{
        backgroundImage: DOT,
        backgroundSize: vertical ? '5px 8px' : '8px 5px',
        backgroundRepeat: vertical ? 'repeat-y' : 'repeat-x',
      }}
    />
  );
}
