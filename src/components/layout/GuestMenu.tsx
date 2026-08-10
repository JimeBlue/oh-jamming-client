'use client';

import Link from 'next/link';
import {
  IoChevronForward,
  IoClose,
  IoLogInOutline,
  IoPersonAddOutline,
} from 'react-icons/io5';

type GuestMenuProps = {
  onClose: () => void;
};

/* What the account button opens for a visitor with no session. Its own surface
   colours rather than inherited ones: the header is white-on-transparent over
   the hero video, and this panel is a white card, so text has to be reset to
   base-content or it would be white on white. */
export default function GuestMenu({ onClose }: GuestMenuProps) {
  return (
    <div className="relative w-80 rounded-box border border-secondary bg-base-100 p-6 text-base-content shadow-2xl">
      {/* Mainly for touch, where there's no cursor to move away — but it costs
          nothing to leave it on every size. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        className="btn btn-ghost btn-sm btn-circle absolute right-2 top-2"
      >
        <IoClose className="size-5" />
      </button>

      <h2 className="pr-8 text-center font-heading text-2xl leading-tight">
        You are not logged in yet
      </h2>

      <Link
        href="/login"
        onClick={onClose}
        className="btn btn-secondary mt-5 w-full gap-2 font-bold"
      >
        <IoLogInOutline className="size-5" />
        Log in
      </Link>

      <div className="divider my-4 text-xs opacity-70">or</div>

      <Link
        href="/register"
        onClick={onClose}
        className="flex items-center gap-3 rounded-box p-2 transition-colors hover:bg-base-200"
      >
        <IoPersonAddOutline className="size-8 shrink-0 text-primary" />

        <span className="flex-1">
          <span className="block font-bold">Register</span>
          <span className="block text-sm opacity-70">
            Create your account and join the community.
          </span>
        </span>

        <IoChevronForward className="size-5 shrink-0 text-secondary" />
      </Link>
    </div>
  );
}
