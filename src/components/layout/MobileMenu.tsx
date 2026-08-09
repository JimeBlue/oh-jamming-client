import { useEffect } from 'react';

import NavActions from './NavActions';
import NavLinks from './NavLinks';

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

/* The drawer behind the hamburger. Shown below lg — on tablet it carries only
   the nav links, since the CTAs are already visible in the bar there. */
export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    // Escape closes it, and the page behind shouldn't scroll while it's open.
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    // top-20 lines the panel up with the bottom edge of the h-20 header.
    <div className="fixed inset-x-0 bottom-0 top-20 z-40 lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
      />

      <nav className="relative bg-neutral px-6 py-8 text-neutral-content shadow-xl">
        <NavLinks
          className="flex flex-col gap-5"
          linkClassName="font-heading text-3xl transition-colors hover:text-accent"
          onNavigate={onClose}
        />
        <NavActions
          className="mt-8 flex flex-col gap-3 md:hidden"
          onNavigate={onClose}
        />
      </nav>
    </div>
  );
}
