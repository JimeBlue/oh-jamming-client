import Link from 'next/link';

type NavActionsProps = {
  className?: string;
  onNavigate?: () => void;
};

/* The two CTAs. Rendered in the bar from tablet up, and inside the mobile
   menu below that — which is why they live in their own component. */
export default function NavActions({
  className,
  onNavigate,
}: NavActionsProps) {
  return (
    <div className={className}>
      {/* Royal blue rather than `btn-secondary`, matching the CTA the browse
          cards and the detail page now wear — the pink stayed on this button
          alone after the re-branding and read as a different action.

          The hover is written out rather than reached for as `btn-outline`,
          because that class also sets the resting state: the fill has to stay
          and only invert on hover. Tailwind's utilities are unlayered inside
          `utilities`, so they beat daisyUI's `.btn:hover` in its nested
          sublayer — otherwise the fill would win and nothing would change. */}
      <Link
        href="/jams"
        onClick={onNavigate}
        className="btn border-royal-blue bg-royal-blue font-bold text-white shadow-none transition-colors hover:border-royal-blue hover:bg-transparent hover:text-royal-blue"
      >
        Book a spot
      </Link>
      <Link
        href="/jams/new"
        onClick={onNavigate}
        className="btn btn-outline btn-accent font-bold"
      >
        Insert your Jam
      </Link>
    </div>
  );
}
