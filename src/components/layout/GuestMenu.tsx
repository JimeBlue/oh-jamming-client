'use client';

import Link from 'next/link';
import {
  IoChevronForward,
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
    /* w-80 is the widest this can be on a 390px phone: the panel is anchored to
       the right edge of the account button, which leaves roughly 320px before
       it would run off the left of the screen. So the heading is fitted to that
       width rather than the panel being widened to the heading. */
    <div className="w-80 rounded-box border border-secondary bg-base-100 p-6 text-base-content shadow-2xl sm:w-96">
      {/* whitespace-nowrap is the guarantee: the size below is chosen to fit,
          and this makes a future wording change fail visibly rather than
          silently wrapping back to two lines. */}
      <h2 className="whitespace-nowrap text-center font-heading text-xl leading-tight sm:text-2xl">
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
