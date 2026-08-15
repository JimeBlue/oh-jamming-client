'use client';

import { createContext, useContext } from 'react';

import type { Booking } from '@/schemas/booking';
import type { JamSession } from '@/schemas/jamSession';

/* The one session this page is about, and its bookings, shared by the three
   panels under it.

   Co-located with the panels rather than in `src/context`, which holds
   AuthContext — a provider every route in the app sits inside. This one exists
   for three sibling routes and dies with them, so keeping it here is what says
   so. Promote it if a fourth thing ever needs it.

   The value is never partial. The shell renders its own loading and error states
   and only mounts the provider once both requests have landed, so a panel can
   destructure `session` without asking whether it arrived — the alternative is
   three panels each re-implementing the same three-state branch.

   It exists at all because a Next layout cannot hand fetched data to `children`:
   the layout renders the rail and the session header, the page renders the
   panel, and they are separate component trees that both need the same session.
   Fetching in each would mean two requests for one page. */
type JamDetail = {
  session: JamSession;
  bookings: Booking[];
};

const JamDetailContext = createContext<JamDetail | null>(null);

export const JamDetailProvider = JamDetailContext.Provider;

export const useJamDetail = (): JamDetail => {
  const detail = useContext(JamDetailContext);

  if (!detail) {
    throw new Error('useJamDetail must be used inside the jam session detail layout');
  }

  return detail;
};
