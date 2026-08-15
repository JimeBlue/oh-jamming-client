/* A PNG used as a glyph, in whatever colour the caller asks for.

   `mask-image` rather than an `<img>`: the assets in `src/assets` that are drawn
   as icons are black artwork on transparency, and this paints the element's own
   background through their alpha. So the colour is a Tailwind token like every
   react-icons glyph beside them, instead of the file being committed a second
   time in a second colour the theme can't reach.

   Decorative by construction — `aria-hidden` is not a prop, because a mask has
   no alt text to give and every caller so far sits next to the word it
   illustrates. A glyph that has to carry meaning on its own wants an `<Image>`
   with a real `alt`, not this.

   Both the prefixed and unprefixed properties: Safari still answers only to
   `-webkit-mask-*`. */
export default function MaskIcon({
  src,
  className,
}: {
  src: string;
  className: string;
}) {
  return (
    <span
      aria-hidden
      className={`shrink-0 ${className}`}
      style={{
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  );
}
