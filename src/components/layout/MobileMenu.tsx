import { useEffect } from 'react';
import { IoClose } from 'react-icons/io5';

import NavActions from './NavActions';
import NavLinks from './NavLinks';

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

/* Slides in from the right. This stays mounted at all times — unmounting it
   when closed would skip the transition and make it pop in.

   daisyUI's own <div class="drawer"> is deliberately not used here: its open
   state is driven by a hidden checkbox and cascade-layer ordering that doesn't
   survive Next's CSS pipeline, so the panel never left translate-x-full. React
   state plus a transform is fewer moving parts and is actually debuggable. */
export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <div
      /* Sits above the header bar, so the logo dims behind the overlay rather
         than floating on top of it. */
      className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        className={`absolute inset-0 h-full w-full cursor-default bg-black/60 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        /* `brand-navy` rather than `bg-neutral`: this panel slides out from
           under the header and the two are joined along that edge, so the app's
           flat black beside the header's dark indigo read as a seam. */
        className={`absolute inset-y-0 right-0 flex w-80 max-w-[85vw] flex-col gap-6 bg-brand-navy p-6 text-neutral-content shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
          /* btn-ghost takes its colour from base-content, which is near-black
             and would vanish on this panel — hence the explicit override.
             Hover fills the circle with base-200, so the icon flips to indigo:
             accent green on that near-white is 1.1:1 and disappears. */
          className="btn btn-ghost btn-circle self-end text-neutral-content hover:text-primary"
        >
          <IoClose className="size-7" />
        </button>

        <NavLinks
          className="flex flex-col gap-5"
          linkClassName="font-heading text-3xl transition-colors hover:text-accent"
          onNavigate={onClose}
        />

        {/* Both only show on mobile — from md up the CTAs are already in the bar.
            A plain rule rather than daisyUI's .divider, which sets flex-grow and
            would stretch to fill the column, pushing the CTAs to the middle. */}
        <hr className="border-neutral-content/20 md:hidden" />
        <NavActions
          className="flex flex-col gap-3 md:hidden"
          onNavigate={onClose}
        />
      </aside>
    </div>
  );
}
