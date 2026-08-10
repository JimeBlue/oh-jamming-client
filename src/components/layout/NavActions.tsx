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
      {/* White on pink is 2.4:1, below the 4.5:1 WCAG AA needs — a deliberate
          brand call, driven by --color-secondary-content in globals.css. */}
      <Link href="/jams" onClick={onNavigate} className="btn btn-secondary font-bold">
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
