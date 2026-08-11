import type { UserRole } from '@/schemas/user';

/* Where each role lands after logging in or registering, and where the
   wrong-role guard sends someone who ended up on the other side of the app.

   Venues have a real home now — the backstage board is a placeholder inside,
   but the address is correct, so nothing has to be rewired when it fills in.
   Musicians still land on `/`: "My spots" doesn't exist yet, and redirecting to
   a page that 404s straight after a *successful* login is worse than landing
   somewhere plain. */
export const HOME_BY_ROLE: Record<UserRole, string> = {
  musician: '/',
  venue: '/my-backstage',
};
