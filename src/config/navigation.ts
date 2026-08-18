import type { UserRole } from '@/schemas/user';

/* Where each role belongs. One caller left: the wrong-role guard's way out,
   which is the one place the destination is genuinely role-specific — someone
   holding the *other* kind of account has walked into a page they can't use,
   and "here is your side of the app" is the whole point of the card.

   Signing in and signing up both send everyone to `/` instead. They used to
   come through here, and a venue landing on their backstage board rather than
   the home page read as a redirect that had gone wrong. */
export const HOME_BY_ROLE: Record<UserRole, string> = {
  musician: '/',
  venue: '/my-backstage',
};
