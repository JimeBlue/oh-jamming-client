import type { UserRole } from '@/schemas/user';

/* Where each role lands after logging in or registering.

   Both point at home for the moment. The real destinations — a musician's
   spots, a venue's backstage — are a later phase and those pages don't exist
   yet, so redirecting to them would 404 the user immediately after a
   *successful* login. Kept in one place so switching them on is a two-line
   change once the pages are built. */
export const HOME_BY_ROLE: Record<UserRole, string> = {
  musician: '/',
  venue: '/',
};
