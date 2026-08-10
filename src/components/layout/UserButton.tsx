'use client';

import { FaRegUserCircle } from 'react-icons/fa';
import { IoChevronDown } from 'react-icons/io5';

import { useAuth } from '@/context/AuthContext';
import useHoverMenu from '@/hooks/useHoverMenu';
import AccountMenu from './AccountMenu';
import GuestMenu from './GuestMenu';

export default function UserButton() {
  const { status, user } = useAuth();
  const {
    open,
    canHover,
    containerRef,
    openMenu,
    closeMenu,
    toggleMenu,
    scheduleClose,
  } = useHoverMenu();

  /* There is nothing to open until we know who this is, and finding out costs a
     round-trip to /auth/me — real time, not a flicker. So the button holds its
     place dimmed instead of guessing "logged out" and correcting itself a
     moment later, which is what would make it flash on every page load. */
  if (status === 'loading') {
    return (
      <span
        aria-busy="true"
        aria-label="Checking your session"
        className="grid size-10 shrink-0 place-items-center text-white opacity-40"
      >
        <FaRegUserCircle className="size-8" />
      </span>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
      /* Undefined rather than a no-op on touch devices, so React doesn't attach
         handlers that a synthetic mouseenter would fire on tap. */
      onMouseEnter={canHover ? openMenu : undefined}
      onMouseLeave={canHover ? scheduleClose : undefined}
    >
      <button
        type="button"
        onClick={toggleMenu}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={
          status === 'authenticated'
            ? `Account menu for ${user.email}`
            : 'Log in or register'
        }
        className="flex cursor-pointer items-center gap-2 text-white transition-opacity hover:opacity-80"
      >
        {status === 'authenticated' ? (
          <>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary font-heading text-lg text-secondary-content">
              {user.email.charAt(0).toUpperCase()}
            </span>

            {/* Below lg the badge is just circle + chevron. max-w + truncate
                because an address long enough to push the layout around is a
                when, not an if. */}
            <span className="hidden max-w-48 truncate text-sm font-medium lg:block">
              {user.email}
            </span>

            <IoChevronDown
              className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </>
        ) : (
          <FaRegUserCircle className="size-8" />
        )}
      </button>

      {open && (
        /* pt-3, not mt-3: the gap between the badge and the panel is padding
           *inside* this element, so the cursor crossing it never leaves the
           hover container and never triggers a close. */
        <div className="absolute right-0 top-full z-50 pt-3">
          {status === 'authenticated' ? (
            <AccountMenu user={user} onClose={closeMenu} />
          ) : (
            <GuestMenu onClose={closeMenu} />
          )}
        </div>
      )}
    </div>
  );
}
